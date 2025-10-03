// No necesita loader ya que el layout se encarga de la autenticación

export default function Modulo2Page() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-card rounded-2xl shadow-dark-lg p-6 border border-dark-600">
        <h1 className="text-3xl font-bold text-white mb-2">
          Módulo 2
        </h1>
        <p className="text-dark-300">
          Funcionalidades adicionales del panel de gestión
        </p>
      </div>

      {/* Contenido */}
      <div className="bg-gradient-card rounded-2xl shadow-dark-lg p-8 border border-dark-600">
        <div className="text-center">
          <div className="mb-6">
            <svg
              className="w-16 h-16 text-accent-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-semibold text-white mb-4">
            Módulo en Desarrollo
          </h2>
          <p className="text-dark-300 mb-6">
            Este módulo está en construcción. Aquí se implementarán funcionalidades adicionales 
            para la gestión avanzada de agentes de IA.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="p-4 bg-dark-700/50 rounded-lg">
              <h3 className="font-semibold text-white mb-2">Funcionalidad Futura 1</h3>
              <p className="text-sm text-dark-300">Descripción de la funcionalidad que se implementará</p>
            </div>
            
            <div className="p-4 bg-dark-700/50 rounded-lg">
              <h3 className="font-semibold text-white mb-2">Funcionalidad Futura 2</h3>
              <p className="text-sm text-dark-300">Descripción de la funcionalidad que se implementará</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
