import React from "react";
import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect, useLoaderData, useActionData, useNavigation } from "react-router";
import { supabaseServer, supabaseAdmin } from "~/supabase/supabaseServer";
import { useState } from "react";
import Toast from "~/components/Toast";
import { useToast } from "~/hooks/useToast";
import UploadAnalyticsModal from "~/components/UploadAnalyticsModal";

// Función para cargar datos de analíticas
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

  try {
    // Obtener todos los reportes de analíticas (lotes)
    const { data: reportes, error } = await supabaseAdmin
      .from('analiticas_report')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error("Error loading analiticas:", error);
      return { reportes: [] };
    }

    return { 
      user: session.data.session.user,
      role: userRole?.role || 'editor',
      reportes: reportes || [] 
    };
  } catch (error) {
    console.error("Error en loader de analiticas:", error);
    return { reportes: [] };
  }
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

    // Validar formato del CSV (debe tener al menos cuatro columnas: phone_number, status, message_id, errors)
    if (lines.length < 2) {
      console.error("❌ CSV inválido: menos de 2 líneas");
      return {
        error: "El archivo CSV debe tener al menos un encabezado y una fila de datos"
      };
    }

    // Verificar que todas las líneas tengan al menos cuatro columnas
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      if (columns.length < 4) {
        console.error(`❌ Línea ${i + 1} tiene ${columns.length} columnas`);
        return {
          error: `Línea ${i + 1}: El archivo debe tener al menos cuatro columnas (phone_number, status, message_id, errors). Se encontraron ${columns.length} columnas.`
        };
      }
    }
    
    console.log("✅ Validación de formato CSV exitosa");

    // Insertar reporte en analiticas_report
    console.log("📝 Insertando reporte de campaña:", campaignName);
    const { data: reportData, error: reportError } = await supabaseAdmin
      .from('analiticas_report')
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

    // Procesar cada fila del CSV y insertar en analiticas_data
    const csvLines = lines.slice(1); // Excluir header
    console.log("📱 Procesando", csvLines.length, "registros de analíticas");
    
    const analyticsRecords = csvLines.map((line, index) => {
      const columns = line.split(',').map(col => col.trim());
      const phone_number = columns[0];
      const message_id = columns[1] || null;  // message_id va en columna 1
      const status = columns[2];            // status va en columna 2
      const errors = columns[3] || null;
      
      // Validar que los campos requeridos no estén vacíos
      if (!phone_number || !status) {
        throw new Error(`Línea ${index + 2}: Phone number o status de contacto vacío`);
      }
      
      let parsedErrors = null;
      if (errors && errors.trim() !== '') {
        try {
          parsedErrors = JSON.parse(errors);
        } catch (e) {
          console.warn(`⚠️ Error parseando JSON en línea ${index + 2}:`, errors);
          parsedErrors = { error: errors };
        }
      }
      
      return {
        report_id: reportData.report_id,
        phone_number: phone_number,
        status: status,
        message_id: message_id,
        errors: parsedErrors
      };
    });

    console.log("📋 Registros preparados para inserción:", analyticsRecords.length);
    console.log("📋 Primeros 3 registros:", analyticsRecords.slice(0, 3));

    // Insertar registros en lote (dividir en chunks si es necesario)
    console.log("💾 Iniciando inserción masiva en analiticas_data...");
    
    const BATCH_SIZE = 1000; // Límite de inserción por lote
    let totalInserted = 0;
    
    for (let i = 0; i < analyticsRecords.length; i += BATCH_SIZE) {
      const batch = analyticsRecords.slice(i, i + BATCH_SIZE);
      console.log(`📦 Procesando lote ${Math.floor(i / BATCH_SIZE) + 1}, registros: ${batch.length}`);
      
      const { data: insertedData, error: analyticsError } = await supabaseAdmin
        .from('analiticas_data')
        .insert(batch)
        .select();

      if (analyticsError) {
        console.error("❌ Error al insertar lote de registros:", analyticsError);
        return {
          error: `Error al procesar los registros: ${analyticsError.message}`
        };
      }
      
      totalInserted += insertedData?.length || 0;
      console.log(`✅ Lote insertado exitosamente: ${insertedData?.length || 0} registros`);
    }
    
    console.log("✅ Total de registros insertados:", totalInserted);
    
    // Actualizar el conteo real en analiticas_report
    if (totalInserted !== totalRecords) {
      console.log("🔄 Actualizando conteo real en reporte...");
      const { error: updateError } = await supabaseAdmin
        .from('analiticas_report')
        .update({ total_records: totalInserted })
        .eq('campaign_name', campaignName);
        
      if (updateError) {
        console.warn("⚠️ No se pudo actualizar el conteo real:", updateError);
      } else {
        console.log("✅ Conteo actualizado a:", totalInserted);
      }
    }

    return {
      success: `Campaña ${campaignName} procesada exitosamente. ${totalInserted} registros de analíticas guardados.`
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

// Función para formatear la fecha
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
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

export default function AnaliticasPage() {
  const { reportes, role } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string; success?: string }>();
  const navigation = useNavigation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const isSubmitting = navigation.state === "submitting";

  const handleUploadClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Real-time updates: Refresh page after successful upload
  React.useEffect(() => {
    if (actionData?.success) {
      // Close modal and refresh data
      setIsModalOpen(false);
      // Small delay to show success message before refresh
      const timer = setTimeout(() => {
        window.location.reload();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [actionData?.success]);


  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              Analíticas de Campañas
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              Análisis de reportes de Callbell
            </p>
          </div>
           <div className="flex items-center gap-3">
             <button
               onClick={handleUploadClick}
               className="px-4 py-2 text-white rounded-lg transition-colors duration-200 text-sm lg:text-base font-medium"
               style={{ backgroundColor: '#7B1E21' }}
               onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a1518'}
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B1E21'}
             >
               📊 Subir CSV
             </button>
            <a
              href="/campanas/difusion"
              className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors duration-200 text-sm lg:text-base"
            >
              ← Volver a Difusión
            </a>
          </div>
        </div>
      </div>


      {/* Contenido Principal */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 lg:p-6">
           {reportes.length === 0 ? (
             <div className="flex items-center justify-center h-full">
               <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 text-center max-w-md">
                 <div className="text-gray-600 mb-6">
                   <svg
                     className="w-16 h-16 mx-auto mb-4"
                     fill="none"
                     stroke="currentColor"
                     viewBox="0 0 24 24"
                   >
                     <path
                       strokeLinecap="round"
                       strokeLinejoin="round"
                       strokeWidth={2}
                       d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                     />
                   </svg>
                   <p className="text-lg">No hay reportes de analíticas</p>
                   <p className="text-sm mt-2">Sube un archivo CSV para comenzar el análisis</p>
                 </div>
                 <button
                   onClick={handleUploadClick}
                   className="px-6 py-3 text-white rounded-lg transition-colors duration-200 font-medium"
                   style={{ backgroundColor: '#7B1E21' }}
                   onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a1518'}
                   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B1E21'}
                 >
                   📊 Subir Primer Reporte
                 </button>
               </div>
             </div>
           ) : (
             <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
               {/* Tabla de Reportes */}
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead className="bg-gray-50 border-b border-gray-200">
                     <tr>
                       <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                         Nombre de Campaña
                       </th>
                       <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                         Total de Registros
                       </th>
                       <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                         Fecha de Subida
                       </th>
                       <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                         Acciones
                       </th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-200">
                     {reportes.map((reporte: any, index: number) => (
                       <tr key={reporte.id || index} className="hover:bg-gray-50 transition-colors duration-200">
                         <td className="px-4 py-4 whitespace-nowrap">
                           <div className="text-sm font-medium text-gray-900">
                             {reporte.campaign_name || 'N/A'}
                           </div>
                         </td>
                         <td className="px-4 py-4 whitespace-nowrap">
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                             {reporte.total_records || 0} registros
                           </span>
                         </td>
                         <td className="px-4 py-4 whitespace-nowrap">
                           <div className="text-sm text-gray-500">
                             {formatDate(reporte.uploaded_at)}
                           </div>
                         </td>
                         <td className="px-4 py-4 whitespace-nowrap">
                           <a
                             href={`/campanas/analitica/${reporte.campaign_name}`}
                             className="font-medium text-sm"
                             style={{ color: '#7B1E21' }}
                             onMouseEnter={(e) => e.currentTarget.style.color = '#5a1518'}
                             onMouseLeave={(e) => e.currentTarget.style.color = '#7B1E21'}
                           >
                             Ver Detalles
                           </a>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           )}
        </div>
      </div>

       {/* Modal de Subida de CSV */}
       <UploadAnalyticsModal 
         isOpen={isModalOpen} 
         onClose={handleCloseModal} 
       />

      {/* Toast de notificaciones */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        duration={4000}
      />
    </div>
  );
}