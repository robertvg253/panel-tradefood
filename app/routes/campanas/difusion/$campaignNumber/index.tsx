import { type LoaderFunctionArgs, useLoaderData, Link } from "react-router";
import { supabaseServer, supabaseAdmin } from "~/supabase/supabaseServer";
import { redirect } from "react-router";
import StandardContainer, { PageHeader, TableContainer } from "~/components/StandardContainer";

// Loader para obtener los detalles de una campaña específica
export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await supabaseServer.auth.getSession();
  
  if (!session.data.session) {
    throw redirect("/");
  }

  // Obtener el rol del usuario
  const { data: userRole, error: roleError } = await supabaseServer
    .from('user_roles')
    .select('role')
    .eq('user_id', session.data.session.user.id)
    .single();

  if (roleError) {
    console.error("Error al obtener el rol del usuario:", roleError);
    throw redirect("/");
  }

  const campaignNumber = params.campaignNumber;
  
  if (!campaignNumber) {
    throw redirect("/campanas/difusion");
  }

  console.log("🔍 Cargando detalles de campaña:", campaignNumber);

  // Obtener los detalles del reporte de la campaña
  const { data: campaignReport, error: reportError } = await supabaseAdmin
    .from('difusion_report')
    .select('*')
    .eq('campaign_name', campaignNumber)
    .single();

  if (reportError) {
    console.error("❌ Error al obtener reporte de campaña:", reportError);
    throw redirect("/campanas/difusion");
  }

  // Obtener todos los registros de difusión de esta campaña
  const { data: difusionRecords, error: recordsError } = await supabaseAdmin
    .from('difusion_data')
    .select('*')
    .eq('campaign', campaignNumber)
    .order('telefono', { ascending: true });

  if (recordsError) {
    console.error("❌ Error al obtener registros de difusión:", recordsError);
  }

  console.log("✅ Datos cargados:", {
    report: campaignReport,
    recordCount: difusionRecords?.length || 0
  });

  return {
    user: session.data.session.user,
    role: userRole?.role || 'editor',
    campaignReport,
    difusionRecords: difusionRecords || []
  };
}

export default function CampaignDetailPage() {
  const { campaignReport, difusionRecords, role } = useLoaderData<typeof loader>();

  // Función para exportar solo los números de teléfono
  const exportTelefonosCSV = () => {
    // Crear contenido CSV solo con teléfonos
    const csvContent = [
      ['Teléfono'], // Solo encabezado de teléfono
      ...difusionRecords.map(record => [
        record.telefono || ''
      ])
    ].map(row => row.join(',')).join('\n');

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `telefonos_${campaignReport.campaign_name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <PageHeader
        title={campaignReport.campaign_name}
        subtitle="Detalles de la campaña de difusión"
        actions={
          <>
            <button 
              onClick={exportTelefonosCSV}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Teléfonos
            </button>
            <Link
              to="/campanas/difusion"
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Volver a Lotes
            </Link>
          </>
        }
      />

      {/* Contenido Principal */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-6">

          {/* Información de la Campaña */}
          <StandardContainer>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de la Campaña</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900">Nombre de Campaña</h3>
                <p className="text-lg font-semibold text-blue-700">{campaignReport.campaign_name}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-900">Total de Registros</h3>
                <p className="text-lg font-semibold text-green-700">{campaignReport.total_records}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-orange-900">Fecha de Subida</h3>
                <p className="text-lg font-semibold text-orange-700">
                  {new Date(campaignReport.uploaded_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            {campaignReport.description && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900">Descripción</h3>
                <p className="text-gray-700">{campaignReport.description}</p>
              </div>
            )}
          </StandardContainer>

          {/* Tabla de Registros de Difusión */}
          <TableContainer>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Registros de Difusión ({difusionRecords.length})
              </h2>
            </div>
        
        {difusionRecords.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay registros de difusión</h3>
            <p className="mt-1 text-sm text-gray-500">Esta campaña no tiene registros de difusión.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {difusionRecords.map((record, index) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {record.telefono}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {record.nombre}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Registrado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </TableContainer>

          {/* Información de registros */}
          <StandardContainer>
            <div className="text-sm text-gray-500">
              Mostrando {difusionRecords.length} de {campaignReport.total_records} registros de difusión
            </div>
          </StandardContainer>
        </div>
      </div>
    </div>
  );
}
