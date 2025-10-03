import { type LoaderFunctionArgs } from "react-router";
import { supabaseServer } from "~/supabase/supabaseServer";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    console.log("🧪 Iniciando prueba de tablas de agente Tradefood...");
    
    // 1. Probar tabla tradefood_prompt_active
    console.log("1️⃣ Probando tabla tradefood_prompt_active...");
    const { data: activeData, error: activeError } = await supabaseServer
      .from('tradefood_prompt_active')
      .select('*');
    
    if (activeError) {
      console.error("❌ Error en tradefood_prompt_active:", activeError);
      return {
        success: false,
        error: `Error en tradefood_prompt_active: ${activeError.message}`,
        details: activeError
      };
    }
    
    console.log("✅ tradefood_prompt_active accesible. Datos:", activeData);
    console.log("📊 Registros en tabla activa:", activeData?.length || 0);
    
    // 2. Probar tabla tradefood_prompt_history
    console.log("2️⃣ Probando tabla tradefood_prompt_history...");
    const { data: historyData, error: historyError } = await supabaseServer
      .from('tradefood_prompt_history')
      .select('*')
      .limit(5);
    
    if (historyError) {
      console.error("❌ Error en tradefood_prompt_history:", historyError);
      return {
        success: false,
        error: `Error en tradefood_prompt_history: ${historyError.message}`,
        details: historyError
      };
    }
    
    console.log("✅ tradefood_prompt_history accesible. Datos:", historyData);
    console.log("📊 Registros en tabla historial:", historyData?.length || 0);
    
    // 3. Probar conteo de registros
    console.log("3️⃣ Probando conteo de registros...");
    const { count: activeCount, error: activeCountError } = await supabaseServer
      .from('tradefood_prompt_active')
      .select('*', { count: 'exact', head: true });
    
    const { count: historyCount, error: historyCountError } = await supabaseServer
      .from('tradefood_prompt_history')
      .select('*', { count: 'exact', head: true });
    
    if (activeCountError) {
      console.error("❌ Error en conteo de tabla activa:", activeCountError);
    } else {
      console.log("📊 Total de registros en tabla activa:", activeCount);
    }
    
    if (historyCountError) {
      console.error("❌ Error en conteo de tabla historial:", historyCountError);
    } else {
      console.log("📊 Total de registros en tabla historial:", historyCount);
    }
    
    return {
      success: true,
      activeData: activeData,
      historyData: historyData,
      activeCount: activeCount,
      historyCount: historyCount,
      activeDataCount: activeData?.length || 0,
      historyDataCount: historyData?.length || 0
    };
    
  } catch (error) {
    console.error("❌ Error inesperado en la prueba:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

export default function TestAgentePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-4">Prueba de Tablas Agente Tradefood</h1>
      <p className="text-gray-300">
        Esta página es solo para testing. Revisa la consola del servidor para ver los resultados.
      </p>
      <div className="mt-4 space-x-4">
        <a 
          href="/tests" 
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          ← Volver a Pruebas
        </a>
        <a 
          href="/agente" 
          className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
        >
          Ir a Agente IA
        </a>
      </div>
    </div>
  );
}
