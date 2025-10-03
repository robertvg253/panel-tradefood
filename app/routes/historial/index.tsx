import { type LoaderFunctionArgs, redirect, useLoaderData } from "react-router";
import { supabaseServer } from "~/supabase/supabaseServer";

// Función para cargar datos del historial
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await supabaseServer.auth.getSession();
  
  if (!session.data.session) {
    throw redirect("/");
  }

  try {
    // Obtener información del usuario actual de la sesión
    const currentUser = session.data.session.user;
    console.log("👤 Usuario actual de la sesión:", {
      id: currentUser.id,
      email: currentUser.email,
      user_metadata: currentUser.user_metadata
    });

    // Consultar la tabla tradefood_prompt_history para obtener el historial
    console.log("🔍 Consultando tabla tradefood_prompt_history...");
    const { data: historialData, error: historialError } = await supabaseServer
      .from('tradefood_prompt_history')
      .select('id, version_number, modified_by_user_id, modified_at, config_id')
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
    console.log("📋 Primeros registros:", historialData?.slice(0, 3).map(r => ({
      id: r.id,
      version_number: r.version_number,
      modified_by_user_id: r.modified_by_user_id,
      modified_at: r.modified_at
    })));

    // Si no hay datos, retornar array vacío
    if (!historialData || historialData.length === 0) {
      console.log("📋 No hay registros de historial");
      return { historial: [] };
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
        } else if (record.modified_by_user_id === currentUser.id) {
          // Si el modified_by_user_id coincide con el usuario actual, usar su información de la sesión
          usuario_info = {
            email: currentUser.email,
            full_name: currentUser.user_metadata?.full_name || currentUser.email,
            role: currentUser.user_metadata?.role || 'Usuario'
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
        agente_nombre: 'Agente Tradefood', // Nombre fijo para el agente Tradefood
        usuario_info
      };
    });

    console.log("✅ Historial procesado exitosamente:", historial.length, "registros");

    return { historial };
  } catch (error) {
    console.error("❌ Error en loader de historial:", error);
    return { historial: [] };
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

export default function HistorialPage() {
  const { historial } = useLoaderData<typeof loader>();

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              Historial de Cambios
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              Registro de todas las modificaciones realizadas en los agentes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors duration-200 text-sm lg:text-base"
            >
              ← Volver al Dashboard
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
                  <p className="text-sm mt-2">Los cambios aparecerán aquí una vez que se editen los agentes</p>
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
                              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                                <svg
                                  className="h-4 w-4 text-orange-500"
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
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
