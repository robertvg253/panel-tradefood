import { Link, Form, type LoaderFunctionArgs, useLoaderData } from "react-router";
import { supabaseServer, supabaseAdmin } from "~/supabase/supabaseServer";
import { redirect } from "react-router";
import StandardContainer, { PageHeader } from "~/components/StandardContainer";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// Loader para obtener métricas reales del dashboard
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await supabaseServer.auth.getSession();
  
  if (!session.data.session) {
    throw redirect("/");
  }

  try {
    // Obtener métricas de agentes
    const { data: activeAgents, error: agentsError } = await supabaseAdmin
      .from('tradefood_prompt_active')
      .select('id, name, version_number, updated_at');

    // Obtener métricas de historial
    const { data: historyCount, error: historyError } = await supabaseAdmin
      .from('tradefood_prompt_history')
      .select('id', { count: 'exact' });

    // Obtener métricas de campañas de difusión
    const { data: diffusionReports, error: diffusionError } = await supabaseAdmin
      .from('difusion_report')
      .select('campaign_name, total_records, uploaded_at')
      .order('uploaded_at', { ascending: false });

    // Obtener métricas de analíticas
    const { data: analyticsReports, error: analyticsError } = await supabaseAdmin
      .from('analiticas_report')
      .select('report_id, campaign_name, total_records, uploaded_at')
      .order('uploaded_at', { ascending: false });

    // Obtener datos de analíticas para métricas de rendimiento
    const { data: analyticsData, error: analyticsDataError } = await supabaseAdmin
      .from('analiticas_data')
      .select('status');

    // Calcular métricas
    const totalAgents = activeAgents?.length || 0;
    const totalVersions = historyCount?.length || 0;
    const totalDiffusionRecords = diffusionReports?.reduce((sum, report) => sum + (report.total_records || 0), 0) || 0;
    const totalAnalyticsRecords = analyticsReports?.reduce((sum, report) => sum + (report.total_records || 0), 0) || 0;
    
    // Calcular métricas de rendimiento de analíticas
    let successRate = 0;
    let totalAnalyticsData = 0;
    if (analyticsData && analyticsData.length > 0) {
      totalAnalyticsData = analyticsData.length;
      const successfulRecords = analyticsData.filter(record => 
        record.status === 'delivered' || record.status === 'read'
      ).length;
      successRate = Math.round((successfulRecords / totalAnalyticsData) * 100);
    }

    // Obtener campañas recientes
    const recentDiffusion = diffusionReports?.slice(0, 3) || [];
    const recentAnalytics = analyticsReports?.slice(0, 3) || [];

    // Datos del último CSV de analíticas
    let latestAnalytics = null;
    if (analyticsReports && analyticsReports.length > 0) {
      const latestReport = analyticsReports[0]; // El más reciente
      
      // Obtener datos de analíticas para este reporte específico
      const { data: latestAnalyticsData, error: dataError } = await supabaseAdmin
        .from('analiticas_data')
        .select('status')
        .eq('report_id', latestReport.report_id);
      
      console.log('Report ID:', latestReport.report_id);
      console.log('Analytics Data:', latestAnalyticsData);
      console.log('Data Error:', dataError);
      
      if (latestAnalyticsData && latestAnalyticsData.length > 0) {
        const totalRecords = latestAnalyticsData.length;
        
        // Contar estados - limpiar strings de comillas
        const readCount = latestAnalyticsData.filter(r => r.status?.replace(/"/g, '').trim() === 'read').length;
        const deliveredCount = latestAnalyticsData.filter(r => r.status?.replace(/"/g, '').trim() === 'delivered').length;
        const sentCount = latestAnalyticsData.filter(r => r.status?.replace(/"/g, '').trim() === 'sent').length;
        const failedCount = latestAnalyticsData.filter(r => r.status?.replace(/"/g, '').trim() === 'failed').length;
        
        console.log('Counts:', { readCount, deliveredCount, sentCount, failedCount, totalRecords });
        
        const readPercentage = totalRecords > 0 ? Math.round((readCount / totalRecords) * 100) : 0;
        const deliveredPercentage = totalRecords > 0 ? Math.round((deliveredCount / totalRecords) * 100) : 0;
        const sentPercentage = totalRecords > 0 ? Math.round((sentCount / totalRecords) * 100) : 0;
        const failedPercentage = totalRecords > 0 ? Math.round((failedCount / totalRecords) * 100) : 0;
        
        const successRate = totalRecords > 0 ? Math.round(((readCount + deliveredCount) / totalRecords) * 100) : 0;
        
        latestAnalytics = {
          reportId: latestReport.report_id,
          campaignName: latestReport.campaign_name,
          totalRecords,
          successRate,
          readCount,
          readPercentage,
          deliveredCount,
          deliveredPercentage,
          sentCount,
          sentPercentage,
          failedCount,
          failedPercentage,
          statusData: [
            { name: 'Leídos', value: readCount, color: '#7C3AED' },
            { name: 'Entregados', value: deliveredCount, color: '#059669' },
            { name: 'Enviados', value: sentCount, color: '#2563EB' },
            { name: 'Fallidos', value: failedCount, color: '#DC2626' }
          ]
        };
        console.log('Final Analytics Object:', latestAnalytics);
      }
    }

    return {
      user: session.data.session.user,
      metrics: {
        totalAgents,
        totalVersions,
        totalDiffusionRecords,
        totalAnalyticsRecords,
        successRate,
        totalAnalyticsData
      },
      recentDiffusion,
      recentAnalytics,
      chartData: {
        latestAnalytics
      }
    };
  } catch (error) {
    console.error("Error loading dashboard metrics:", error);
    return {
      user: session.data.session.user,
      metrics: {
        totalAgents: 0,
        totalVersions: 0,
        totalDiffusionRecords: 0,
        totalAnalyticsRecords: 0,
        successRate: 0,
        totalAnalyticsData: 0
      },
      recentDiffusion: [],
      recentAnalytics: []
    };
  }
}

export default function DashboardPage() {
  const { metrics, recentDiffusion, recentAnalytics, chartData } = useLoaderData<typeof loader>();

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <PageHeader
        title="Panel Administrativo"
        subtitle="Resumen general del sistema y métricas de rendimiento"
        actions={
          <Form method="post" action="/logout">
            <button
              type="submit"
              className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar Sesión
            </button>
          </Form>
        }
      />

      {/* Contenido Principal */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-3">
          
          {/* Métricas Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Agentes Activos */}
            <StandardContainer className="p-3 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold" style={{ color: '#111827' }}>{metrics.totalAgents}</p>
                  <p className="text-sm font-medium" style={{ color: '#7B1E21' }}>Agentes Activos</p>
                </div>
                <div className="p-3 rounded-full" style={{ backgroundColor: '#7B1E21' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </StandardContainer>

            {/* Versiones Guardadas */}
            <StandardContainer className="p-3 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold" style={{ color: '#111827' }}>{metrics.totalVersions}</p>
                  <p className="text-sm font-medium" style={{ color: '#7B1E21' }}>Versiones</p>
                </div>
                <div className="p-3 rounded-full" style={{ backgroundColor: '#2563EB' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </StandardContainer>

            {/* Registros de Difusión */}
            <StandardContainer className="p-3 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold" style={{ color: '#111827' }}>{metrics.totalDiffusionRecords.toLocaleString()}</p>
                  <p className="text-sm font-medium" style={{ color: '#7B1E21' }}>Registros</p>
                </div>
                <div className="p-3 rounded-full" style={{ backgroundColor: '#059669' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
              </div>
            </StandardContainer>

            {/* Tasa de Éxito */}
            <StandardContainer className="p-3 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold" style={{ color: '#111827' }}>{metrics.successRate}%</p>
                  <p className="text-sm font-medium" style={{ color: '#7B1E21' }}>Éxito</p>
                </div>
                <div className="p-3 rounded-full" style={{ backgroundColor: '#DC2626' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </StandardContainer>
          </div>

          {/* Análisis del Último CSV de Analíticas */}
          {chartData.latestAnalytics ? (
            <StandardContainer className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 rounded-full mr-3" style={{ backgroundColor: '#2563EB' }}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: '#111827' }}>Análisis del Último Reporte</h3>
                    <p className="text-sm" style={{ color: '#6B7280' }}>{chartData.latestAnalytics.campaignName}</p>
                  </div>
                </div>
          <Link
                  to={`/campanas/analitica/${chartData.latestAnalytics.reportId}`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors duration-200 hover:opacity-90"
                  style={{ backgroundColor: '#7B1E21' }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
                  Ver Detalles
          </Link>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Métricas Principales */}
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold" style={{ color: '#111827' }}>{chartData.latestAnalytics.totalRecords}</p>
                    <p className="text-xs font-medium" style={{ color: '#7B1E21' }}>Total Registros</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold" style={{ color: '#111827' }}>{chartData.latestAnalytics.successRate}%</p>
                    <p className="text-xs font-medium" style={{ color: '#7B1E21' }}>Tasa de Éxito</p>
                  </div>
                </div>
                
                {/* Gráfica de Estados */}
                <div className="lg:col-span-2">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.latestAnalytics.statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.latestAnalytics.statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#F9FAFB',
                            border: '1px solid #E5E5E5',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Leyenda Compacta */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#7C3AED' }}></div>
                        <span className="text-xs font-medium" style={{ color: '#111827' }}>Leídos</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: '#7C3AED' }}>{chartData.latestAnalytics.readPercentage}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#059669' }}></div>
                        <span className="text-xs font-medium" style={{ color: '#111827' }}>Entregados</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: '#059669' }}>{chartData.latestAnalytics.deliveredPercentage}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#2563EB' }}></div>
                        <span className="text-xs font-medium" style={{ color: '#111827' }}>Enviados</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: '#2563EB' }}>{chartData.latestAnalytics.sentPercentage}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#DC2626' }}></div>
                        <span className="text-xs font-medium" style={{ color: '#111827' }}>Fallidos</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: '#DC2626' }}>{chartData.latestAnalytics.failedPercentage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </StandardContainer>
          ) : (
            <StandardContainer className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 rounded-full mr-3" style={{ backgroundColor: '#2563EB' }}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: '#111827' }}>Análisis de Analíticas</h3>
                    <p className="text-sm" style={{ color: '#6B7280' }}>No hay datos de analíticas disponibles</p>
                  </div>
                </div>
                <Link
                  to="/campanas/analitica"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors duration-200 hover:opacity-90"
                  style={{ backgroundColor: '#7B1E21' }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Subir CSV
                </Link>
              </div>
              
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                  <svg className="w-8 h-8" style={{ color: '#9CA3AF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium mb-2" style={{ color: '#111827' }}>No hay reportes de analíticas</h4>
                <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                  Sube tu primer CSV de analíticas para ver el análisis detallado aquí
                </p>
          <Link
                  to="/campanas/analitica"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors duration-200 hover:opacity-90"
                  style={{ backgroundColor: '#7B1E21' }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Subir Primer Reporte
                </Link>
              </div>
            </StandardContainer>
          )}

          {/* Acciones Rápidas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gestión de Agentes */}
            <StandardContainer className="p-3 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center mb-3">
                <div className="p-2 rounded-full mr-3" style={{ backgroundColor: '#7B1E21' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold" style={{ color: '#111827' }}>Gestión de Agentes</h2>
              </div>
              <div className="space-y-2">
                <Link
                  to="/agentes"
                  className="flex items-center p-3 rounded-lg transition-all duration-200 group border"
                  style={{ backgroundColor: '#F5F5F5', borderColor: '#E5E5E5' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F0F0F0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                  }}
                >
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#7B1E21' }}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-sm" style={{ color: '#111827' }}>Ver Agentes</h3>
                    <p className="text-xs" style={{ color: '#374151' }}>Gestiona tus agentes de IA</p>
            </div>
                  <svg className="w-4 h-4 text-gray-400 ml-auto group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
          </Link>

          <Link
                  to="/historial"
                  className="flex items-center p-3 rounded-lg transition-all duration-200 group border"
                  style={{ backgroundColor: '#F5F5F5', borderColor: '#E5E5E5' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F0F0F0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                  }}
                >
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#7B1E21' }}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-sm" style={{ color: '#111827' }}>Historial</h3>
                    <p className="text-xs" style={{ color: '#374151' }}>Revisa versiones anteriores</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 ml-auto group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </StandardContainer>

            {/* Campañas */}
            <StandardContainer className="p-3 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center mb-3">
                <div className="p-2 rounded-full mr-3" style={{ backgroundColor: '#059669' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold" style={{ color: '#111827' }}>Campañas</h2>
              </div>
              <div className="space-y-2">
                <Link
                  to="/campanas/difusion"
                  className="flex items-center p-3 rounded-lg transition-all duration-200 group border"
                  style={{ backgroundColor: '#F5F5F5', borderColor: '#E5E5E5' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F0F0F0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                  }}
                >
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#7B1E21' }}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-sm" style={{ color: '#111827' }}>Difusión</h3>
                    <p className="text-xs" style={{ color: '#374151' }}>{metrics.totalDiffusionRecords.toLocaleString()} registros</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 ml-auto group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </StandardContainer>

            {/* Analíticas */}
            <StandardContainer className="p-3 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center mb-3">
                <div className="p-2 rounded-full mr-3" style={{ backgroundColor: '#2563EB' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold" style={{ color: '#111827' }}>Analíticas</h2>
              </div>
              <div className="space-y-2">
                <Link
                  to="/campanas/analitica"
                  className="flex items-center p-3 rounded-lg transition-all duration-200 group border"
                  style={{ backgroundColor: '#F5F5F5', borderColor: '#E5E5E5' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F0F0F0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                  }}
                >
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#7B1E21' }}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-sm" style={{ color: '#111827' }}>Reportes</h3>
                    <p className="text-xs" style={{ color: '#374151' }}>{metrics.totalAnalyticsRecords.toLocaleString()} registros</p>
            </div>
                  <svg className="w-4 h-4 text-gray-400 ml-auto group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
          </Link>
              </div>
            </StandardContainer>
          </div>

          {/* Actividad Reciente */}
          {(recentDiffusion.length > 0 || recentAnalytics.length > 0) && (
            <StandardContainer className="p-3">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-full mr-3" style={{ backgroundColor: '#7C3AED' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold" style={{ color: '#111827' }}>Actividad Reciente</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentDiffusion.length > 0 && (
                  <div className="rounded-lg p-3 border" style={{ backgroundColor: '#F5F5F5', borderColor: '#E5E5E5' }}>
                    <div className="flex items-center mb-2">
                      <div className="p-1.5 rounded-lg mr-2" style={{ backgroundColor: '#059669' }}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </div>
                      <h3 className="text-xs font-semibold" style={{ color: '#111827' }}>Últimas Campañas Difusión</h3>
                    </div>
                    <div className="space-y-1">
                      {recentDiffusion.slice(0, 2).map((campaign, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border" style={{ borderColor: '#7B1E21', borderOpacity: 0.1 }}>
                          <div className="flex items-center">
                            <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: '#059669' }}></div>
                            <span className="text-xs font-medium text-gray-900 truncate">{campaign.campaign_name}</span>
                          </div>
                          <span className="text-xs text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: '#7B1E21' }}>{campaign.total_records}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {recentAnalytics.length > 0 && (
                  <div className="rounded-lg p-3 border" style={{ backgroundColor: '#F5F5F5', borderColor: '#E5E5E5' }}>
                    <div className="flex items-center mb-2">
                      <div className="p-1.5 rounded-lg mr-2" style={{ backgroundColor: '#2563EB' }}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-xs font-semibold" style={{ color: '#111827' }}>Últimos Reportes Analíticas</h3>
                    </div>
                    <div className="space-y-1">
                      {recentAnalytics.slice(0, 2).map((report, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border" style={{ borderColor: '#7B1E21', borderOpacity: 0.1 }}>
                          <div className="flex items-center">
                            <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: '#2563EB' }}></div>
                            <span className="text-xs font-medium text-gray-900 truncate">{report.campaign_name}</span>
                          </div>
                          <span className="text-xs text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: '#7B1E21' }}>{report.total_records}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </StandardContainer>
          )}
        </div>
      </div>
    </div>
  );
}
