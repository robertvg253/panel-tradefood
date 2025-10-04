import { type LoaderFunctionArgs, useLoaderData, Link } from "react-router";
import { supabaseServer, supabaseAdmin } from "~/supabase/supabaseServer";
import { redirect } from "react-router";
import { useState } from "react";

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
    throw redirect("/campanas/analitica");
  }

  console.log("🔍 Cargando detalles de campaña:", campaignNumber);

  // Obtener los detalles del reporte de la campaña
  const { data: campaignReport, error: reportError } = await supabaseAdmin
    .from('analiticas_report')
    .select('*')
    .eq('campaign_name', campaignNumber)
    .single();

  if (reportError) {
    console.error("❌ Error al obtener reporte de campaña:", reportError);
    throw redirect("/campanas/analitica");
  }

  // Obtener todos los registros de analíticas de esta campaña
  const { data: analyticsRecords, error: recordsError } = await supabaseAdmin
    .from('analiticas_data')
    .select('*')
    .eq('report_id', campaignReport.report_id)
    .order('phone_number', { ascending: true });

  if (recordsError) {
    console.error("❌ Error al obtener registros de analíticas:", recordsError);
  }

  console.log("✅ Datos cargados:", {
    report: campaignReport,
    recordCount: analyticsRecords?.length || 0
  });

  return {
    user: session.data.session.user,
    role: userRole?.role || 'editor',
    campaignReport,
    analyticsRecords: analyticsRecords || []
  };
}

// Función para obtener el color del estado
function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'read':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Función para obtener el texto del estado
function getStatusText(status: string) {
  switch (status?.toLowerCase()) {
    case 'delivered':
      return 'Entregado';
    case 'failed':
      return 'Fallido';
    case 'read':
      return 'Leído';
    default:
      return status || 'Desconocido';
  }
}

export default function AnalyticsDetailPage() {
  const { campaignReport, analyticsRecords, role } = useLoaderData<typeof loader>();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filtrar registros por estado
  const filteredRecords = analyticsRecords.filter(record => {
    if (filterStatus === 'all') return true;
    return record.status?.toLowerCase() === filterStatus.toLowerCase();
  });

  // Función para exportar CSV con filtros
  const exportCSV = () => {
    const csvContent = [
      ['phone_number', 'status', 'message_id', 'errors'],
      ...filteredRecords.map(record => [
        record.phone_number,
        record.status,
        record.message_id || '',
        record.errors ? JSON.stringify(record.errors) : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analiticas_${campaignReport.campaign_name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              to="/campanas/analitica"
              className="mr-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{campaignReport.campaign_name}</h1>
              <p className="text-gray-600">Análisis de datos de Callbell</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={exportCSV}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </button>
            <Link
              to="/campanas/analitica"
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Volver a Reportes
            </Link>
          </div>
        </div>
      </div>

      {/* Información de la Campaña */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filtrar por estado:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">Todos</option>
            <option value="delivered">Entregado</option>
            <option value="failed">Fallido</option>
            <option value="read">Leído</option>
          </select>
          <span className="text-sm text-gray-500">
            {filteredRecords.length} de {analyticsRecords.length} registros
          </span>
        </div>
      </div>

      {/* Tabla de Registros de Analíticas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Registros de Analíticas ({analyticsRecords.length})
          </h2>
        </div>
        
        {analyticsRecords.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay registros de analíticas</h3>
            <p className="mt-1 text-sm text-gray-500">Esta campaña no tiene registros de analíticas.</p>
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
                    Número de Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detalles del Error
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record, index) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {record.phone_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {getStatusText(record.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {record.message_id || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {record.errors ? (
                          typeof record.errors === 'object' ? (
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(record.errors, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-red-600">{record.errors}</span>
                          )
                        ) : (
                          <span className="text-gray-400">Sin errores</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Información de registros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-sm text-gray-500">
          Mostrando {filteredRecords.length} de {campaignReport.total_records} registros de analíticas
        </div>
      </div>
    </div>
  );
}
