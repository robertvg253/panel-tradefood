import { type LoaderFunctionArgs, redirect, useLoaderData } from "react-router";
import { supabaseServer } from "~/supabase/supabaseServer";
import { useState } from "react";

// Función para cargar datos de un agente específico
export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await supabaseServer.auth.getSession();
  
  if (!session.data.session) {
    throw redirect("/");
  }

  try {
    // Obtener el agente específico
    console.log("🔍 Cargando agente:", params.promptId);
    const { data: agent, error } = await supabaseServer
      .from('tradefood_prompt_active')
      .select('*')
      .eq('id', params.promptId)
      .single();

    if (error) {
      console.error("❌ Error loading agent:", error);
      throw new Response("Agente no encontrado", { status: 404 });
    }

    console.log("✅ Agente cargado exitosamente:", {
      id: agent.id,
      name: agent.name,
      version_number: agent.version_number
    });

    return { agent };
  } catch (error) {
    console.error("❌ Error en loader de agente:", error);
    throw new Response("Error al cargar el agente", { status: 500 });
  }
}

// Definir los campos del prompt con sus etiquetas
const promptFields = [
  { key: 'prompt_identidad', label: 'Identidad y Rol del Agente', icon: '🎭' },
  { key: 'prompt_personalidad_tono', label: 'Personalidad y Tono de Voz', icon: '😊' },
  { key: 'prompt_frases_guia_estilo', label: 'Frases Guía y Estilo', icon: '💬' },
  { key: 'prompt_reglas_limitaciones', label: 'Reglas y Limitaciones', icon: '⚠️' },
  { key: 'prompt_flujos_atencion', label: 'Flujos de Atención', icon: '🔄' },
  { key: 'prompt_informacion_empresa', label: 'Información de la Empresa', icon: '🏢' },
  { key: 'prompt_preguntas_frecuentes', label: 'Preguntas Frecuentes', icon: '❓' },
];

export default function VerAgentePage() {
  const { agent } = useLoaderData<typeof loader>();
  const [selectedField, setSelectedField] = useState(promptFields[0].key);

  const selectedFieldData = promptFields.find(field => field.key === selectedField);
  const selectedValue = agent[selectedField as keyof typeof agent] || '';

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              {agent.name}
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              Vista de Solo Lectura - Versión {agent.version_number || 1}
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
              href={`/agente/${agent.id}/editar`}
              className="px-4 py-2 text-white rounded-lg transition-colors duration-200 text-sm lg:text-base font-medium"
              style={{ backgroundColor: '#7B1E21' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a1518'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B1E21'}
            >
              ✏️ Editar
            </a>
            <a
              href={`/agente/${agent.id}/historial`}
              className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors duration-200 text-sm lg:text-base"
            >
              📋 Historial
            </a>
          </div>
        </div>
      </div>

      {/* Contenido Principal - Doble Columna */}
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
              <div className="w-full h-full bg-white border border-gray-300 rounded-lg p-4 overflow-y-auto">
                {selectedValue ? (
                  <div className="whitespace-pre-wrap text-gray-900 text-sm leading-relaxed">
                    {selectedValue}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm italic">
                    No hay contenido disponible para este campo
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
