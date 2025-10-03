export default function CampanasAnaliticaPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mr-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Análitica de Campañas</h1>
            <p className="text-gray-600">Análisis y métricas de rendimiento de campañas</p>
          </div>
        </div>
      </div>

      {/* Mensaje de Próxima Implementación */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="text-center py-16">
          <div className="mx-auto h-24 w-24 text-gray-400 mb-6">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Próxima Implementación</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            El módulo de análisis de campañas está en desarrollo. Pronto podrás ver métricas detalladas, 
            gráficos de rendimiento y análisis avanzados de tus campañas.
          </p>
          <div className="flex justify-center space-x-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Métricas en Tiempo Real</h4>
              <p className="text-xs text-blue-700">Seguimiento de entregas y respuestas</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">Análisis de Audiencia</h4>
              <p className="text-xs text-green-700">Segmentación y comportamiento</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-900 mb-2">Reportes Avanzados</h4>
              <p className="text-xs text-orange-700">Exportación y visualización</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
