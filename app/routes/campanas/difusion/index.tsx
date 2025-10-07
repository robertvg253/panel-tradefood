import { type LoaderFunctionArgs, type ActionFunctionArgs, useLoaderData, useActionData, useNavigate, Link } from "react-router";
import { supabaseServer, supabaseAdmin } from "~/supabase/supabaseServer";
import { redirect } from "react-router";
import { useState, useEffect } from "react";
import UploadCampaignModal from "~/components/UploadCampaignModal";
import StandardContainer, { PageHeader, TableContainer } from "~/components/StandardContainer";

// Verificar autenticación y obtener reportes de campañas de difusión
export async function loader({ request }: LoaderFunctionArgs) {
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

  // Obtener reportes de campañas de difusión
  const { data: campaignReports, error: reportsError } = await supabaseAdmin
    .from('difusion_report')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (reportsError) {
    console.error("Error al obtener reportes de campañas:", reportsError);
  }

  return {
    user: session.data.session.user,
    role: userRole?.role || 'editor',
    campaignReports: campaignReports || []
  };
}

// Action para subir y procesar archivos CSV
export async function action({ request }: ActionFunctionArgs) {
  const session = await supabaseServer.auth.getSession();
  
  if (!session.data.session) {
    throw redirect("/");
  }

  // Verificar rol del usuario
  const { data: userRole, error: roleError } = await supabaseServer
    .from('user_roles')
    .select('role')
    .eq('user_id', session.data.session.user.id)
    .single();

  if (roleError || !userRole?.role || (userRole.role !== 'administrador' && userRole.role !== 'editor')) {
    return {
      error: "No tienes permisos para subir archivos"
    };
  }

  const formData = await request.formData();
  const file = formData.get("csvFile") as File;
  const campaignName = formData.get("campaignName") as string;

  if (!file || !campaignName) {
    return {
      error: "Por favor, completa todos los campos"
    };
  }

  if (!file.name.endsWith('.csv')) {
    return {
      error: "Solo se permiten archivos CSV"
    };
  }

  try {
    console.log("📁 Iniciando procesamiento de CSV:", file.name, "Tamaño:", file.size);
    
    // Leer el contenido del archivo CSV
    const csvContent = await file.text();
    console.log("📄 Contenido CSV leído, longitud:", csvContent.length);
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const totalRecords = lines.length - 1; // Excluir header
    
    console.log("📊 Líneas procesadas:", lines.length, "Registros de datos:", totalRecords);

    // Validar formato del CSV (debe tener exactamente dos columnas: teléfono y nombre)
    if (lines.length < 2) {
      console.error("❌ CSV inválido: menos de 2 líneas");
      return {
        error: "El archivo CSV debe tener al menos un encabezado y una fila de datos"
      };
    }

    // Verificar que todas las líneas tengan exactamente dos columnas
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      if (columns.length !== 2) {
        console.error(`❌ Línea ${i + 1} tiene ${columns.length} columnas`);
        return {
          error: `Línea ${i + 1}: El archivo debe tener exactamente dos columnas (teléfono y nombre). Se encontraron ${columns.length} columnas.`
        };
      }
    }
    
    console.log("✅ Validación de formato CSV exitosa");

    // Insertar reporte en difusion_report
    console.log("📝 Insertando reporte de campaña:", campaignName);
    const { data: reportData, error: reportError } = await supabaseAdmin
      .from('difusion_report')
      .insert({
        campaign_name: campaignName,
        report_id: `RPT-${Date.now()}`,
        total_records: totalRecords,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (reportError) {
      console.error("❌ Error al insertar reporte:", reportError);
      return {
        error: `Error al guardar el reporte: ${reportError.message}`
      };
    }
    
    console.log("✅ Reporte insertado exitosamente:", reportData);

    // Procesar cada fila del CSV y insertar en difusion_data
    const csvLines = lines.slice(1); // Excluir header
    console.log("📱 Procesando", csvLines.length, "registros de difusión");
    
    const campaignRecords = csvLines.map((line, index) => {
      const [telefono, nombre] = line.split(',').map(col => col.trim());
      
      // Validar que ambos campos no estén vacíos
      if (!telefono || !nombre) {
        throw new Error(`Línea ${index + 2}: Teléfono o nombre de contacto vacío`);
      }
      
      return {
        campaign: campaignName,
        telefono: telefono,    // ← Teléfono va en telefono
        nombre: nombre          // ← Nombre va en nombre
      };
    });

    console.log("📋 Registros preparados para inserción:", campaignRecords.length);
    console.log("📋 Primeros 3 registros:", campaignRecords.slice(0, 3));

    // Insertar registros en lote (dividir en chunks si es necesario)
    console.log("💾 Iniciando inserción masiva en difusion_data...");
    
    const BATCH_SIZE = 1000; // Límite de inserción por lote
    let totalInserted = 0;
    
    for (let i = 0; i < campaignRecords.length; i += BATCH_SIZE) {
      const batch = campaignRecords.slice(i, i + BATCH_SIZE);
      console.log(`📦 Procesando lote ${Math.floor(i / BATCH_SIZE) + 1}, registros: ${batch.length}`);
      
      const { data: insertedData, error: campaignError } = await supabaseAdmin
        .from('difusion_data')
        .insert(batch)
        .select();

      if (campaignError) {
        console.error("❌ Error al insertar lote de registros:", campaignError);
        return {
          error: `Error al procesar los registros: ${campaignError.message}`
        };
      }
      
      totalInserted += insertedData?.length || 0;
      console.log(`✅ Lote insertado exitosamente: ${insertedData?.length || 0} registros`);
    }
    
    console.log("✅ Total de registros insertados:", totalInserted);
    
    // Actualizar el conteo real en difusion_report
    if (totalInserted !== totalRecords) {
      console.log("🔄 Actualizando conteo real en reporte...");
      const { error: updateError } = await supabaseAdmin
        .from('difusion_report')
        .update({ total_records: totalInserted })
        .eq('campaign_name', campaignName);
        
      if (updateError) {
        console.warn("⚠️ No se pudo actualizar el conteo real:", updateError);
      } else {
        console.log("✅ Conteo actualizado a:", totalInserted);
      }
    }

    return {
      success: `Campaña ${campaignName} procesada exitosamente. ${totalInserted} registros de difusión guardados.`
    };

  } catch (error) {
    console.error("❌ Error en procesamiento de CSV:", error);
    
    // Si es un error de validación específico, mostrarlo
    if (error instanceof Error && error.message.includes('Línea')) {
      return {
        error: error.message
      };
    }
    
    return {
      error: `Error del servidor: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

export default function CampanasDifusionPage() {
  const { campaignReports, role } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string; success?: string }>();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
  };

  // Real-time updates: Refresh page after successful upload
  useEffect(() => {
    if (actionData?.success) {
      // Close modal and refresh data
      setIsUploadModalOpen(false);
      // Small delay to show success message before refresh
      const timer = setTimeout(() => {
        navigate('.', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [actionData?.success, navigate]);

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <PageHeader
        title="Campañas Difusión"
        subtitle="Administra y supervisa las campañas de difusión"
        actions={
          <>
            <button
              onClick={handleUploadClick}
              className="text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              style={{ backgroundColor: '#7B1E21' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a1518'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B1E21'}
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Subir CSV
            </button>
            <button 
              onClick={() => {
                // Create CSV content
                const csvContent = [
                  ['Número de Campaña', 'Total de Registros', 'Fecha de Subida', 'Descripción'],
                  ...campaignReports.map(report => [
                    report.campaign_number,
                    report.total_records.toString(),
                    new Date(report.uploaded_at).toLocaleDateString('es-ES'),
                    report.description
                  ])
                ].map(row => row.join(',')).join('\n');

                // Create and download file
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `campañas_difusion_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar
            </button>
          </>
        }
      />

      {/* Contenido Principal */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-6">

          {/* Mensajes de éxito/error */}
          {actionData?.error && (
            <StandardContainer className="bg-red-50 border-red-200">
              <p className="text-red-600">{actionData.error}</p>
            </StandardContainer>
          )}

          {actionData?.success && (
            <StandardContainer className="bg-green-50 border-green-200">
              <p className="text-green-600">{actionData.success}</p>
            </StandardContainer>
          )}

          {/* Tabla de Campañas */}
          <TableContainer>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Lotes de Campañas</h2>
            </div>
        
        {campaignReports.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay campañas</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza subiendo tu primer archivo CSV.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre de Campaña
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total de Registros
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Subida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaignReports.map((report) => (
                  <tr key={report.campaign_name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {report.campaign_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {report.total_records} registros
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.uploaded_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          to={`/campanas/difusion/${report.campaign_name}`}
                          className="px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200"
                          style={{ color: 'white', backgroundColor: '#7B1E21' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.backgroundColor = '#5a1518';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.backgroundColor = '#7B1E21';
                          }}
                        >
                          Ver Detalles
                        </Link>
                        <button className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200">
                          Descargar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </TableContainer>
        </div>
      </div>

      {/* Modal de Subida */}
      <UploadCampaignModal
        isOpen={isUploadModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
