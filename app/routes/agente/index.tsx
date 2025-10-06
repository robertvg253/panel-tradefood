import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect, useLoaderData, useActionData, useNavigation } from "react-router";
import { supabaseServer, supabaseAdmin } from "~/supabase/supabaseServer";
import { useState, useEffect } from "react";
import Toast from "~/components/Toast";
import { useToast } from "~/hooks/useToast";

// Función para cargar datos del prompt activo
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await supabaseServer.auth.getSession();
  
  if (!session.data.session) {
    throw redirect("/");
  }

  // Consultar la tabla tradefood_prompt_active para obtener la configuración actual
  const { data: activePrompt, error } = await supabaseServer
    .from('tradefood_prompt_active')
    .select('*')
    .single();
  
  if (error) {
    console.error("Error loading active prompt:", error);
    // Si no existe un prompt activo, devolver valores por defecto
    return { 
      activePrompt: {
        prompt_identidad: '',
        prompt_personalidad_tono: '',
        prompt_frases_guia_estilo: '',
        prompt_reglas_limitaciones: '',
        prompt_flujos_atencion: '',
        prompt_informacion_empresa: '',
        prompt_preguntas_frecuentes: '',
        version_number: 0
      }
    };
  }
  
  return { activePrompt };
}

// Función para manejar el guardado y versionado de prompts
export async function action({ request }: ActionFunctionArgs) {
  const session = await supabaseServer.auth.getSession();
  
  if (!session.data.session) {
    throw redirect("/");
  }

  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  if (actionType === "update") {
    // Obtener todos los campos del formulario (columnas reales de la tabla)
    const prompt_identidad = formData.get("prompt_identidad") as string;
    const prompt_personalidad_tono = formData.get("prompt_personalidad_tono") as string;
    const prompt_frases_guia_estilo = formData.get("prompt_frases_guia_estilo") as string;
    const prompt_reglas_limitaciones = formData.get("prompt_reglas_limitaciones") as string;
    const prompt_flujos_atencion = formData.get("prompt_flujos_atencion") as string;
    const prompt_informacion_empresa = formData.get("prompt_informacion_empresa") as string;
    const prompt_preguntas_frecuentes = formData.get("prompt_preguntas_frecuentes") as string;

    // Validar campos requeridos
    if (!prompt_identidad || !prompt_personalidad_tono) {
      return {
        error: "Por favor, completa todos los campos requeridos (Identidad del Agente y Personalidad y Tono)"
      };
    }

    try {
      console.log("🔧 Iniciando operación de guardado...");
      console.log("🔧 Cliente de Supabase configurado:", !!supabaseServer);
      
      // Obtener el prompt activo actual para conocer la versión
      const { data: currentPrompt, error: fetchError } = await supabaseServer
        .from('tradefood_prompt_active')
        .select('*')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching current prompt:", fetchError);
        throw fetchError;
      }

      const currentVersion = currentPrompt?.version_number || 0;
      const newVersion = currentVersion + 1;
      console.log(`🔄 Versión actual: ${currentVersion}, Nueva versión: ${newVersion}`);

      // Obtener el usuario de la sesión
      const userId = session.data.session.user.id;
      const userEmail = session.data.session.user.email;
      
      console.log("👤 Usuario autenticado:", {
        id: userId,
        email: userEmail
      });

      // Verificar si el usuario existe en la tabla users
      let userExists = null;
      const { data: existingUser, error: userCheckError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userCheckError && userCheckError.code !== 'PGRST116') {
        console.error("Error verificando usuario:", userCheckError);
      } else if (existingUser) {
        userExists = existingUser;
      }

      console.log("🔍 Usuario existe en tabla users:", !!userExists);

      // Si el usuario no existe, crearlo automáticamente
      if (!userExists) {
        console.log("👤 Creando usuario en tabla users...");
        const { data: newUser, error: createUserError } = await supabaseAdmin
          .from('users')
          .insert([{
            id: userId,
            email: userEmail,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (createUserError) {
          console.error("❌ Error creando usuario:", createUserError);
        } else {
          console.log("✅ Usuario creado exitosamente:", newUser);
          userExists = newUser;
        }
      }

      // Si existe un prompt activo, moverlo al historial
      if (currentPrompt) {
        console.log("📝 Moviendo prompt actual al historial...");
        console.log("📝 Versión que se guarda en historial:", newVersion);
        
        const historyData = {
          config_id: currentPrompt.id, // Referencia al prompt activo
          modified_by_user_id: userExists ? userId : null, // NULL real, no string "null"
          version_number: newVersion,
          prompt_content_identidad: prompt_identidad,
          prompt_content_personalidad_tono: prompt_personalidad_tono,
          prompt_content_frases_guia_estilo: prompt_frases_guia_estilo,
          prompt_content_reglas_limitaciones: prompt_reglas_limitaciones,
          prompt_content_flujos_atencion: prompt_flujos_atencion,
          prompt_content_informacion_empresa: prompt_informacion_empresa,
          prompt_content_preguntas_frecuentes: prompt_preguntas_frecuentes
        };

        const { data: historyResult, error: historyError } = await supabaseAdmin
          .from('tradefood_prompt_history')
          .insert([historyData])
          .select();

        if (historyError) {
          console.error("❌ Error al guardar en historial:", historyError);
          throw new Error(`Error al guardar historial: ${historyError.message}`);
        }

        console.log("✅ Historial guardado exitosamente:", historyResult);
      }

      // Actualizar o crear el prompt activo
      console.log("🔄 Preparando actualización del prompt activo...");
      console.log("🔄 Nueva versión que se asignará:", newVersion);
      
      const promptData = {
        prompt_identidad,
        prompt_personalidad_tono: prompt_personalidad_tono || null,
        prompt_frases_guia_estilo: prompt_frases_guia_estilo || null,
        prompt_reglas_limitaciones: prompt_reglas_limitaciones || null,
        prompt_flujos_atencion: prompt_flujos_atencion || null,
        prompt_informacion_empresa: prompt_informacion_empresa || null,
        prompt_preguntas_frecuentes: prompt_preguntas_frecuentes || null,
        version_number: newVersion
      };

      let updatedPrompt;
      if (currentPrompt) {
        // Actualizar el prompt existente
        console.log("🔄 Actualizando prompt existente con datos:", promptData);
        console.log("🔄 ID del prompt a actualizar:", currentPrompt.id);
        
        const { data, error: updateError } = await supabaseAdmin
          .from('tradefood_prompt_active')
          .update(promptData)
          .eq('id', currentPrompt.id)
          .select()
          .single();

        if (updateError) {
          console.error("❌ Error updating active prompt:", updateError);
          console.error("❌ Detalles del error:", {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          });
          throw updateError;
        }
        updatedPrompt = data;
      } else {
        // Crear un nuevo prompt activo
        const { data, error: insertError } = await supabaseAdmin
          .from('tradefood_prompt_active')
          .insert([promptData])
          .select()
          .single();

        if (insertError) {
          console.error("Error creating active prompt:", insertError);
          throw insertError;
        }
        updatedPrompt = data;
      }

      console.log("✅ Prompt activo actualizado exitosamente");

      return {
        success: "Prompt actualizado correctamente",
        prompt: updatedPrompt,
        version: newVersion
      };
    } catch (error) {
      console.error("❌ Error updating prompt:", error);
      return {
        error: error instanceof Error ? error.message : "Error al guardar el prompt. Intenta de nuevo."
      };
    }
  }

  return { error: "Acción no válida" };
}

// Definir los campos del prompt con sus etiquetas (columnas reales de la tabla)
const promptFields = [
  { key: 'prompt_identidad', label: 'Identidad y Rol del Agente', icon: '🎭' },
  { key: 'prompt_personalidad_tono', label: 'Personalidad y Tono de Voz', icon: '😊' },
  { key: 'prompt_frases_guia_estilo', label: 'Frases Guía y Estilo', icon: '💬' },
  { key: 'prompt_reglas_limitaciones', label: 'Reglas y Limitaciones', icon: '⚠️' },
  { key: 'prompt_flujos_atencion', label: 'Flujos de Atención', icon: '🔄' },
  { key: 'prompt_informacion_empresa', label: 'Información de la Empresa', icon: '🏢' },
  { key: 'prompt_preguntas_frecuentes', label: 'Preguntas Frecuentes', icon: '❓' },
];

// Componente para campos editables
interface EditableFieldProps {
  fieldKey: string;
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (fieldKey: string, value: string) => void;
  placeholder?: string;
}

function EditableField({ fieldKey, label, value, isEditing, onChange, placeholder }: EditableFieldProps) {
  if (isEditing) {
    return (
      <div className="flex flex-col h-full">
        <label className="block text-xs font-medium text-gray-600 mb-2 flex-shrink-0">
          {label}
        </label>
        <textarea
          name={fieldKey}
          value={value}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          placeholder={placeholder}
          className="flex-1 w-full bg-white border border-gray-300 rounded-lg p-4 text-gray-900 text-sm placeholder-gray-500 focus:ring-2 focus:border-transparent resize-none overflow-y-auto"
          style={{ '--tw-ring-color': '#7B1E21' } as React.CSSProperties}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <label className="block text-xs font-medium text-gray-600 mb-2 flex-shrink-0">
        {label}
      </label>
      <div className="flex-1 bg-white border border-gray-300 rounded-lg p-4 overflow-y-auto">
        {value ? (
          <div className="whitespace-pre-wrap text-gray-900 text-sm leading-relaxed">
            {value}
          </div>
        ) : (
          <div className="text-gray-500 text-sm italic">
            {placeholder || "No hay contenido disponible para este campo"}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgenteFormPage() {
  const { activePrompt } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string; success?: string; prompt?: any; version?: number }>();
  const navigation = useNavigation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  
  const [selectedField, setSelectedField] = useState('prompt_identidad');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  const isSubmitting = navigation.state === "submitting";

  // Inicializar formData cuando se carga el prompt
  useEffect(() => {
    if (activePrompt) {
      const initialData: Record<string, string> = {};
      promptFields.forEach(field => {
        initialData[field.key] = activePrompt[field.key as keyof typeof activePrompt] || '';
      });
      setFormData(initialData);
    }
  }, [activePrompt]);

  // Detectar cambios en el formulario
  useEffect(() => {
    if (activePrompt && isEditing) {
      const hasFormChanges = promptFields.some(field => {
        const currentValue = activePrompt[field.key as keyof typeof activePrompt] || '';
        const formValue = formData[field.key] || '';
        return currentValue !== formValue;
      });
      setHasChanges(hasFormChanges);
    }
  }, [formData, activePrompt, isEditing]);

  // Manejar respuestas del servidor
  useEffect(() => {
    if (actionData?.success) {
      setIsEditing(false);
      setHasChanges(false);
      showSuccess(`Prompt actualizado exitosamente (v${actionData.version || 'N/A'})`);
      // Recargar la página para obtener los datos actualizados
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else if (actionData?.error) {
      showError(actionData.error);
    }
  }, [actionData, showSuccess, showError]);

  // Manejar cambios en los campos
  const handleFieldChange = (fieldKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  // Manejar el modo de edición
  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Restaurar datos originales
    if (activePrompt) {
      const originalData: Record<string, string> = {};
      promptFields.forEach(field => {
        originalData[field.key] = activePrompt[field.key as keyof typeof activePrompt] || '';
      });
      setFormData(originalData);
    }
    setHasChanges(false);
  };

  const selectedFieldData = promptFields.find(field => field.key === selectedField);
  const selectedValue = activePrompt?.[selectedField as keyof typeof activePrompt] || '';

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 lg:p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              Agente IA Tradefood
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              Gestión de Prompts - Versión {activePrompt?.version_number || 0}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <>
                <a
                  href="/historial"
                  className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors duration-200 text-sm lg:text-base"
                >
                  📋 Historial
                </a>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 text-white rounded-lg transition-all duration-200 text-sm lg:text-base font-medium"
                  style={{ backgroundColor: '#7B1E21' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a1518'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B1E21'}
                >
                   Editar
                </button>
                <a
                  href="/dashboard"
                  className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors duration-200 text-sm lg:text-base"
                >
                  ← Volver
                </a>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors duration-200 text-sm lg:text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="prompt-form"
                  disabled={!hasChanges || isSubmitting}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm lg:text-base font-medium ${
                    hasChanges && !isSubmitting
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
              </>
            )}
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
            <form id="prompt-form" method="post" className="h-full">
              <input type="hidden" name="actionType" value="update" />
              {/* Campos ocultos para todos los datos del formulario */}
              {promptFields.map(field => (
                <input
                  key={field.key}
                  type="hidden"
                  name={field.key}
                  value={formData[field.key] || ''}
                />
              ))}
              <EditableField
                fieldKey={selectedField}
                label={selectedFieldData?.label || ''}
                value={isEditing ? (formData[selectedField] || '') : (selectedValue || '')}
                isEditing={isEditing}
                onChange={handleFieldChange}
                placeholder={`Ingresa el contenido para ${selectedFieldData?.label}`}
              />
            </form>
          </div>
        </div>
      </div>

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
