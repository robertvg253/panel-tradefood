import { type LoaderFunctionArgs, redirect, useLoaderData } from "react-router";
import { supabaseServer } from "~/supabase/supabaseServer";

// Función para cargar datos del historial de un agente específico
export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await supabaseServer.auth.getSession();
  
  if (!session.data.session) {
    throw redirect("/");
  }

  try {
    // Obtener información del agente
    const { data: agent, error: agentError } = await supabaseServer
      .from('tradefood_prompt_active')
      .select('id, name')
      .eq('id', params.promptId)
      .single();

    if (agentError) {
      console.error("❌ Error loading agent:", agentError);
      throw new Response("Agente no encontrado", { status: 404 });
    }

    // Obtener el historial específico del agente usando config_id
    console.log("🔍 Consultando historial para agente:", agent.name, "ID:", agent.id);
    const { data: historialData, error: historialError } = await supabaseServer
      .from('tradefood_prompt_history')
      .select('id, version_number, modified_by_user_id, modified_at, config_id')
      .eq('config_id', agent.id)
      .order('version_number', { ascending: false });

    if (historialError) {
      console.error("❌ Error loading historial:", historialError);
      console.error("❌ Detalles del error:", {
        code: historialError.code,
        message: historialError.message,
        details: historialError.details
      });
      throw new Error(`Error al cargar el historial: ${historialError.message}`);
    }

    console.log("📋 Historial consultado exitosamente:", historialData?.length || 0, "registros");

    // Si no hay datos, retornar array vacío
    if (!historialData || historialData.length === 0) {
      console.log("📋 No hay registros de historial para este agente");
      return { agent, historial: [] };
    }

    // Obtener información de usuarios por separado
    const userIds = [...new Set(historialData.map(h => h.modified_by_user_id).filter(Boolean))];

    console.log("👤 User IDs encontrados:", userIds);

    // Obtener información de usuarios desde auth.users
    let usuariosInfo = {};
    if (userIds.length > 0) {
      // Intentar obtener desde la tabla users personalizada primero
      const { data: usuarios, error: usuariosError } = await supabaseServer
        .from('users')
        .select('id, email, user_metadata')
        .in('id', userIds);

      if (usuariosError) {
        console.error("Error loading usuarios from users table:", usuariosError);
      } else {
        usuariosInfo = usuarios?.reduce((acc, usuario) => {
          acc[usuario.id] = {
            email: usuario.email,
            full_name: usuario.user_metadata?.full_name,
            role: usuario.user_metadata?.role || 'Usuario'
          };
          return acc;
        }, {} as Record<string, any>) || {};
        console.log("👥 Usuarios info from users table:", usuariosInfo);
      }

      // Para usuarios no encontrados en la tabla users, intentar obtener desde auth.users
      const missingUserIds = userIds.filter(id => !(usuariosInfo as Record<string, any>)[id]);
      if (missingUserIds.length > 0) {
        console.log("🔍 Buscando usuarios faltantes en auth.users:", missingUserIds);
        
        // Usar el admin client para acceder a auth.users
        const { data: authUsers, error: authError } = await supabaseServer.auth.admin.listUsers();
        
        if (authError) {
          console.error("Error loading auth users:", authError);
        } else {
          const authUsersInfo = authUsers.users
            .filter(user => missingUserIds.includes(user.id))
            .reduce((acc, user) => {
              acc[user.id] = {
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email,
                role: user.user_metadata?.role || 'Usuario'
              };
              return acc;
            }, {} as Record<string, any>);
          
          console.log("👥 Usuarios info from auth.users:", authUsersInfo);
          
          // Combinar la información
          usuariosInfo = { ...usuariosInfo, ...authUsersInfo };
        }
      }
    }

    // Combinar los datos del historial
    console.log("🔄 Procesando datos del historial...");
    const historial = historialData.map(record => {
      let usuario_info = (usuariosInfo as Record<string, any>)[record.modified_by_user_id];
      
      if (!usuario_info) {
        if (record.modified_by_user_id === null) {
          // Para registros sin modified_by_user_id, mostrar información genérica
          usuario_info = { 
            email: 'Sistema', 
            full_name: 'Usuario del Sistema', 
            role: 'Sistema' 
          };
        } else {
          // Para casos donde el usuario no existe en la tabla users pero tiene un ID
          usuario_info = { 
            email: 'Usuario no encontrado', 
            full_name: 'Usuario no encontrado', 
            role: 'Usuario' 
          };
        }
      }

      return {
        ...record,
        agente_nombre: agent.name,
        usuario_info
      };
    });

    console.log("✅ Historial procesado exitosamente:", historial.length, "registros");

    return { agent, historial };
  } catch (error) {
    console.error("❌ Error en loader de historial:", error);
    return { agent: null, historial: [] };
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

// Función para obtener el nombre del usuario
function getUserName(usuarioInfo: any) {
  if (!usuarioInfo) return 'Usuario desconocido';
  return usuarioInfo.full_name || usuarioInfo.email || 'Usuario desconocido';
}

// Función para obtener el rol del usuario
function getUserRole(usuarioInfo: any) {
  if (!usuarioInfo) return 'Usuario';
  return usuarioInfo.role || 'Usuario';
}

export default function HistorialAgentePage() {
  const { agent, historial } = useLoaderData<typeof loader>();

  if (!agent) {
    return (
      <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-gray-50">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Agente no encontrado</h1>
            <a
              href="/agentes"
              className="px-4 py-2 text-white rounded-lg transition-colors duration-200"
              style={{ backgroundColor: '#7B1E21' }}
            >
              ← Volver a Agentes
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              Historial de {agent.name}
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              Registro de todas las modificaciones realizadas en este agente
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/agentes"
              className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors duration-200 text-sm lg:text-base"
            >
              ← Volver a Agentes
            </a>
            <a
              href={`/agente/${agent.id}/ver`}
              className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors duration-200 text-sm lg:text-base"
            >
              👁️ Ver Agente
            </a>
            <a
              href={`/agente/${agent.id}/editar`}
              className="px-4 py-2 text-white rounded-lg transition-colors duration-200 text-sm lg:text-base font-medium"
              style={{ backgroundColor: '#7B1E21' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a1518'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B1E21'}
            >
              ✏️ Editar Agente
            </a>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 lg:p-6">
          {historial.length === 0 ? (
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-lg">No hay registros de historial</p>
                  <p className="text-sm mt-2">Los cambios aparecerán aquí una vez que se edite el agente</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Tabla de Historial */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Agente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Versión
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Fecha de Modificación
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {historial.map((record: any) => (
                      <tr
                        key={record.id}
                        className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                        onClick={() => {
                          window.location.href = `/historial/${record.id}`;
                        }}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#7B1E21', opacity: 0.1 }}>
                                <svg
                                  className="h-4 w-4"
                                  style={{ color: '#7B1E21' }}
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
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {record.agente_nombre}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#7B1E21', color: 'white' }}>
                            v{record.version_number}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getUserName(record.usuario_info)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.usuario_info?.email}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600">
                            {getUserRole(record.usuario_info)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {formatDate(record.modified_at)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <a
                            href={`/historial/${record.id}`}
                            className="text-sm font-medium"
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
    </div>
  );
}
