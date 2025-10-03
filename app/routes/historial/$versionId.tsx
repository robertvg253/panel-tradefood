import { type LoaderFunctionArgs, redirect, useLoaderData } from "react-router";
import { supabaseServer } from "~/supabase/supabaseServer";
import { useState } from "react";

// Función para cargar datos de una versión específica del historial
export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await supabaseServer.auth.getSession();
  
  if (!session.data.session) {
    throw redirect("/");
  }

  try {
    // Obtener la versión específica del historial
    console.log("🔍 Cargando versión específica:", params.versionId);
    const { data: versionData, error: versionError } = await supabaseServer
      .from('tradefood_prompt_history')
      .select('*')
      .eq('id', params.versionId)
      .single();

    if (versionError) {
      console.error("❌ Error loading version:", versionError);
      throw new Response("Versión no encontrada", { status: 404 });
    }

    console.log("📋 Versión cargada exitosamente:", {
      id: versionData.id,
      version_number: versionData.version_number,
      modified_by_user_id: versionData.modified_by_user_id,
      modified_at: versionData.modified_at
    });

    // Obtener información del usuario que editó
    let usuario_info = null;
    if (versionData.modified_by_user_id) {
      // Intentar obtener desde la tabla users personalizada primero
      const { data: usuario, error: usuarioError } = await supabaseServer
        .from('users')
        .select('id, email, user_metadata')
        .eq('id', versionData.modified_by_user_id)
        .single();

      if (usuarioError && usuarioError.code !== 'PGRST116') {
        console.error("Error loading usuario from users table:", usuarioError);
      } else if (usuario) {
        usuario_info = {
          email: usuario.email,
          full_name: usuario.user_metadata?.full_name,
          role: usuario.user_metadata?.role || 'Usuario'
        };
      }

      // Si no se encontró en la tabla users, intentar desde auth.users
      if (!usuario_info) {
        const { data: authUsers, error: authError } = await supabaseServer.auth.admin.listUsers();
        
        if (!authError) {
          const authUser = authUsers.users.find(user => user.id === versionData.modified_by_user_id);
          if (authUser) {
            usuario_info = {
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || authUser.email,
              role: authUser.user_metadata?.role || 'Usuario'
            };
          }
        }
      }
    }

    // Si no se encontró información del usuario, usar información genérica
    if (!usuario_info) {
      if (versionData.modified_by_user_id === null) {
        usuario_info = { 
          email: 'Sistema', 
          full_name: 'Usuario del Sistema', 
          role: 'Sistema' 
        };
      } else {
        usuario_info = { 
          email: 'Usuario no encontrado', 
          full_name: 'Usuario no encontrado', 
          role: 'Usuario' 
        };
      }
    }

    return { 
      version: versionData,
      usuario_info
    };
  } catch (error) {
    console.error("❌ Error en loader de versión:", error);
    throw new Response("Error al cargar la versión", { status: 500 });
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

// Definir los campos del prompt con sus etiquetas (columnas reales de la tabla tradefood_prompt_history)
const promptFields = [
  { key: 'prompt_content_identidad', label: 'Identidad y Rol del Agente', icon: '🎭' },
  { key: 'prompt_content_personalidad_tono', label: 'Personalidad y Tono de Voz', icon: '😊' },
  { key: 'prompt_content_frases_guia_estilo', label: 'Frases Guía y Estilo', icon: '💬' },
  { key: 'prompt_content_reglas_limitaciones', label: 'Reglas y Limitaciones', icon: '⚠️' },
  { key: 'prompt_content_flujos_atencion', label: 'Flujos de Atención', icon: '🔄' },
  { key: 'prompt_content_informacion_empresa', label: 'Información de la Empresa', icon: '🏢' },
  { key: 'prompt_content_preguntas_frecuentes', label: 'Preguntas Frecuentes', icon: '❓' },
];

export default function HistorialVersionPage() {
  const { version, usuario_info } = useLoaderData<typeof loader>();
  const [selectedField, setSelectedField] = useState(promptFields[0].key);

  const selectedFieldData = promptFields.find(field => field.key === selectedField);
  const selectedValue = version[selectedField as keyof typeof version] || '';

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header con Metadatos de Auditoría */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              Agente IA Tradefood
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              Gestión de Prompts - Versión {version.version_number}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-gray-500">
                Modificado por: {getUserName(usuario_info)}
              </span>
              <span className="text-xs text-gray-500">
                Fecha: {formatDate(version.modified_at)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/historial"
              className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors duration-200 text-sm lg:text-base"
            >
              ← Volver al Historial
            </a>
            <a
              href="/agente"
              className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors duration-200 text-sm lg:text-base"
            >
              Ver Versión Actual
            </a>
            <button
              onClick={() => {
                // TODO: Implementar funcionalidad de restaurar
                alert('Funcionalidad de restaurar pendiente de implementar');
              }}
              className="px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors duration-200 text-sm lg:text-base font-medium"
            >
              🔄 Restaurar Versión
            </button>
          </div>
        </div>
      </div>

      {/* Contenido Principal - Doble Columna (EXACTA RÉPLICA de /agente) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Columna Izquierda - Navegación de Campos (25% en desktop, 100% en móvil) */}
        <div className="w-full lg:w-1/4 bg-white border-b lg:border-b-0 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-3 lg:p-4 border-b border-gray-200">
            <h2 className="text-xs font-semibold text-gray-900">
              Campos del Prompt
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <nav>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-0">
                {promptFields.map((field) => (
                  <button
                    key={field.key}
                    onClick={() => setSelectedField(field.key)}
                    className={`w-full text-left transition-all duration-200 ${
                      selectedField === field.key
                        ? 'bg-gray-100 text-gray-900 p-2 lg:p-3'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg p-2 lg:p-3'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-xs mr-2 lg:mr-3">{field.icon}</span>
                      <span className="text-xs font-medium truncate">
                        {field.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </div>

        {/* Columna Derecha - Área de Contenido (75% en desktop, 100% en móvil) */}
        <div className="w-full lg:w-3/4 flex flex-col bg-gray-50 overflow-hidden">
          <div className="flex-shrink-0 p-3 lg:p-4">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 flex items-center">
              <span className="mr-2 lg:mr-3">{selectedFieldData?.icon}</span>
              {selectedFieldData?.label}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 lg:p-6">
            <div className="h-full">
              <textarea
                readOnly
                value={selectedValue || ''}
                className="w-full h-full bg-transparent border-none outline-none resize-none text-gray-900 text-sm leading-relaxed"
                placeholder={`No hay contenido disponible para ${selectedFieldData?.label}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
