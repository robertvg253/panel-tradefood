import { type LoaderFunctionArgs, useLoaderData, Link } from "react-router";
import { supabaseServer, supabaseAdmin } from "~/supabase/supabaseServer";
import { redirect } from "react-router";
import { useState } from "react";
import StatusBadge from "~/components/StatusBadge";
import StandardContainer, { PageHeader, MetricsContainer, TableContainer } from "~/components/StandardContainer";

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

  // Función para limpiar datos (eliminar comillas dobles)
  const cleanData = (data: any) => {
    if (typeof data === 'string') {
      return data.replace(/"/g, '').trim();
    }
    return data;
  };

  // Limpiar los datos de los registros
  const cleanedRecords = analyticsRecords?.map(record => ({
    ...record,
    phone_number: cleanData(record.phone_number),
    status: cleanData(record.status),
    message_id: cleanData(record.message_id)
  })) || [];

  // Calcular métricas específicas de esta campaña
  let campaignMetrics = null;
  if (cleanedRecords && cleanedRecords.length > 0) {
    console.log("📊 Calculando métricas de campaña...");
    console.log("📊 Registros a procesar:", cleanedRecords.length);
    console.log("📊 Primeros 3 registros:", cleanedRecords.slice(0, 3));
    
    const totalRecords = cleanedRecords.length;
    
    // Contar por estado (limpiando el status)
    const statusCounts = cleanedRecords.reduce((acc, record) => {
      const cleanStatus = cleanData(record.status).toLowerCase();
      console.log(`📊 Procesando status: "${record.status}" -> "${cleanStatus}"`);
      acc[cleanStatus] = (acc[cleanStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("📊 Conteos por estado:", statusCounts);

    // Calcular porcentajes
    campaignMetrics = {
      total: totalRecords,
      read: {
        count: statusCounts.read || 0,
        percentage: totalRecords > 0 ? Math.round(((statusCounts.read || 0) / totalRecords) * 100) : 0
      },
      delivered: {
        count: statusCounts.delivered || 0,
        percentage: totalRecords > 0 ? Math.round(((statusCounts.delivered || 0) / totalRecords) * 100) : 0
      },
      sent: {
        count: statusCounts.sent || 0,
        percentage: totalRecords > 0 ? Math.round(((statusCounts.sent || 0) / totalRecords) * 100) : 0
      },
      failed: {
        count: statusCounts.failed || 0,
        percentage: totalRecords > 0 ? Math.round(((statusCounts.failed || 0) / totalRecords) * 100) : 0
      }
    };

    console.log("✅ Métricas de campaña calculadas:", campaignMetrics);
  }

  console.log("✅ Datos cargados:", {
    report: campaignReport,
    recordCount: analyticsRecords?.length || 0,
    metrics: campaignMetrics
  });

  return {
    user: session.data.session.user,
    role: userRole?.role || 'editor',
    campaignReport,
    analyticsRecords: cleanedRecords,
    metrics: campaignMetrics
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
  const { campaignReport, analyticsRecords, role, metrics } = useLoaderData<typeof loader>();
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
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <PageHeader
        title={campaignReport.campaign_name}
        subtitle="Análisis de datos de Callbell"
        actions={
          <>
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
          </>
        }
      />

      {/* Contenido Principal */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* Métricas de la Campaña */}
          {metrics && (
            <MetricsContainer>
            {/* Total de Registros */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
              <div className="w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#7B1E21', opacity: 0.1 }}>
                <svg className="w-3 h-3" style={{ color: '#7B1E21' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-500 mb-1">Total</p>
              <p className="text-lg font-bold text-gray-900">{metrics.total.toLocaleString()}</p>
            </div>

            {/* Leídos */}
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 text-center">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-purple-600 mb-1">Leídos</p>
              <p className="text-lg font-bold text-purple-900">{metrics.read.percentage}%</p>
              <p className="text-xs text-purple-500">{metrics.read.count.toLocaleString()}</p>
            </div>

            {/* Entregados */}
            <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-green-600 mb-1">Entregados</p>
              <p className="text-lg font-bold text-green-900">{metrics.delivered.percentage}%</p>
              <p className="text-xs text-green-500">{metrics.delivered.count.toLocaleString()}</p>
            </div>

            {/* Enviados */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <p className="text-xs font-medium text-blue-600 mb-1">Enviados</p>
              <p className="text-lg font-bold text-blue-900">{metrics.sent.percentage}%</p>
              <p className="text-xs text-blue-500">{metrics.sent.count.toLocaleString()}</p>
            </div>

            {/* Fallidos */}
            <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-red-600 mb-1">Fallidos</p>
              <p className="text-lg font-bold text-red-900">{metrics.failed.percentage}%</p>
              <p className="text-xs text-red-500">{metrics.failed.count.toLocaleString()}</p>
            </div>
        </MetricsContainer>
      )}

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
      </StandardContainer>

          {/* Filtros */}
          <StandardContainer>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filtrar por estado:
                </label>
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer"
                    style={{ '--tw-ring-color': '#7B1E21' } as React.CSSProperties}
                  >
                    <option value="all">📊 Todos los estados</option>
                    <option value="read">🟣 Leído</option>
                    <option value="delivered">🟢 Entregado</option>
                    <option value="sent">🔵 Enviado</option>
                    <option value="failed">🔴 Fallido</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="text-sm text-gray-600">
                    {filteredRecords.length} de {analyticsRecords.length} registros
                  </span>
                </div>
                
                {filterStatus !== 'all' && (
                  <button
                    onClick={() => setFilterStatus('all')}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar filtro
                  </button>
                )}
              </div>
            </div>
          </StandardContainer>

          {/* Tabla de Registros de Analíticas */}
          <TableContainer>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Registros de Analíticas ({filteredRecords.length}{filterStatus !== 'all' ? ` de ${analyticsRecords.length}` : ''})
                {filterStatus !== 'all' && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Filtrado por: {filterStatus === 'read' ? '🟣 Leído' : filterStatus === 'delivered' ? '🟢 Entregado' : filterStatus === 'sent' ? '🔵 Enviado' : filterStatus === 'failed' ? '🔴 Fallido' : filterStatus}
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Vista simplificada - Solo información esencial
              </p>
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
                      <StatusBadge status={record.status} />
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
              Mostrando {filteredRecords.length} de {campaignReport.total_records} registros de analíticas
            </div>
          </StandardContainer>
        </div>
      </div>
    </div>
  );
}
