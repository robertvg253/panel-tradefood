import { type LoaderFunctionArgs, redirect, useLoaderData } from "react-router";
import { supabaseServer } from "~/supabase/supabaseServer";
import { useState } from "react";

// Función para cargar todos los agentes activos
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await supabaseServer.auth.getSession();
  
  if (!session.data.session) {
    throw redirect("/");
  }

  try {
    // Obtener todos los prompts activos
    const { data: agents, error } = await supabaseServer
      .from('tradefood_prompt_active')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error loading agents:", error);
      return { agents: [] };
    }

    console.log("✅ Agentes cargados exitosamente:", agents?.length || 0, "agentes");
    
    return { agents: agents || [] };
  } catch (error) {
    console.error("❌ Error en loader de agentes:", error);
    return { agents: [] };
  }
}

// Función para formatear la fecha
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Función para obtener el estado del agente basado en la última actualización
function getAgentStatus(updatedAt: string) {
  const now = new Date();
  const updated = new Date(updatedAt);
  const diffInDays = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return { text: 'Actualizado hoy', color: 'text-green-600' };
  if (diffInDays === 1) return { text: 'Actualizado ayer', color: 'text-yellow-600' };
  if (diffInDays < 7) return { text: `Actualizado hace ${diffInDays} días`, color: 'text-yellow-600' };
  return { text: `Actualizado hace ${diffInDays} días`, color: 'text-red-600' };
}

export default function AgentesPage() {
  const { agents } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState('agentes');

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Gestión de Agentes IA
            </h1>
            <p className="text-gray-600">
              Administra y configura tus agentes de inteligencia artificial
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Navegación de pestañas */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('agentes')}
              className={`relative py-4 px-1 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'agentes'
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Agentes
              {activeTab === 'agentes' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: '#7B1E21' }}></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('historia')}
              className={`relative py-4 px-1 text-sm font-medium transition-colors duration-200 ${
                activeTab === 'historia'
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Historial
              {activeTab === 'historia' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: '#7B1E21' }}></div>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          {activeTab === 'agentes' ? (
            agents.length === 0 ? (
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
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-lg">No hay agentes configurados</p>
                    <p className="text-sm mt-2">Los agentes aparecerán aquí una vez que se configuren</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {agents.map((agent: any) => {
                  const status = getAgentStatus(agent.updated_at);
                  return (
                    <div key={agent.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 mr-8">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{agent.name}</h3>
                                <p className={`text-sm ${status.color}`}>{status.text}</p>
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#7B1E21', color: 'white' }}>
                                  v{agent.version_number || 1}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-left">
                                <p className="text-xs text-gray-500 mb-1">Última actualización</p>
                                <p className="text-sm text-gray-900 font-medium">{formatDate(agent.updated_at)}</p>
                              </div>
                              <div className="text-left">
                                <p className="text-xs text-gray-500 mb-1">Versión actual</p>
                                <p className="text-sm text-gray-900 font-medium">{agent.version_number || 1}</p>
                              </div>
                              <div className="text-left">
                                <p className="text-xs text-gray-500 mb-1">Estado</p>
                                <p className={`text-sm font-medium ${status.color}`}>{status.text}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2 w-32">
                            <a
                              href={`/agente/${agent.id}/ver`}
                              className="w-full px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg transition-colors duration-200 text-sm font-medium text-center"
                            >
                              Ver
                            </a>
                            <a
                              href={`/agente/${agent.id}/editar`}
                              className="w-full px-4 py-2 text-white rounded-lg transition-colors duration-200 text-sm font-medium text-center"
                              style={{ backgroundColor: '#7B1E21' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a1518'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B1E21'}
                            >
                              Editar
                            </a>
                            <a
                              href={`/agente/${agent.id}/historial`}
                              className="w-full px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg transition-colors duration-200 text-sm font-medium text-center"
                            >
                              Historial
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {agents.map((agent: any) => {
                const status = getAgentStatus(agent.updated_at);
                return (
                  <div key={agent.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 mr-8">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">{agent.name}</h3>
                              <p className={`text-sm ${status.color}`}>{status.text}</p>
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#7B1E21', color: 'white' }}>
                                v{agent.version_number || 1}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-left">
                              <p className="text-xs text-gray-500 mb-1">Número de versiones</p>
                              <p className="text-sm text-gray-900 font-medium">{agent.version_number || 1}</p>
                            </div>
                            <div className="text-left">
                              <p className="text-xs text-gray-500 mb-1">Versión actual</p>
                              <p className="text-sm text-gray-900 font-medium">{agent.version_number || 1}</p>
                            </div>
                            <div className="text-left">
                              <p className="text-xs text-gray-500 mb-1">Última actualización</p>
                              <p className="text-sm text-gray-900 font-medium">{formatDate(agent.updated_at)}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2 w-36">
                          <a
                            href={`/agente/${agent.id}/historial`}
                            className="w-full px-4 py-2 text-white rounded-lg transition-colors duration-200 text-sm font-medium text-center"
                            style={{ backgroundColor: '#7B1E21' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a1518'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B1E21'}
                          >
                            Ver Historial
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
