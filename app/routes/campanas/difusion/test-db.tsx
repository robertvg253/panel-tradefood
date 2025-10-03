import { type LoaderFunctionArgs } from "react-router";
import { supabaseServer, supabaseAdmin } from "~/supabase/supabaseServer";
import { redirect } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await supabaseServer.auth.getSession();
  
  if (!session.data.session) {
    throw redirect("/");
  }

  console.log("🔍 Verificando conexión a Supabase...");

  // Verificar que las tablas existan
  try {
    // Probar conexión a difusion_report
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('difusion_report')
      .select('*')
      .limit(1);

    console.log("📊 difusion_report:", { reports, reportsError });

    // Probar conexión a difusion_data
    const { data: data, error: dataError } = await supabaseAdmin
      .from('difusion_data')
      .select('*')
      .limit(1);

    console.log("📱 difusion_data:", { data, dataError });

    return {
      user: session.data.session.user,
      reports: reports || [],
      data: data || [],
      reportsError: reportsError?.message,
      dataError: dataError?.message
    };

  } catch (error) {
    console.error("❌ Error en verificación de BD:", error);
    return {
      user: session.data.session.user,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

export default function TestDbPage() {
  const { reports, data, reportsError, dataError, error } = useLoaderData<typeof loader>();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Verificación de Base de Datos</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error General:</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tabla difusion_report */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tabla: difusion_report</h2>
          
          {reportsError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">
                <strong>Error:</strong> {reportsError}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-green-600 text-sm">✅ Conexión exitosa</p>
              <p className="text-gray-600 text-sm">Registros encontrados: {reports.length}</p>
              {reports.length > 0 && (
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Primer registro:</p>
                  <pre className="text-xs text-gray-700">{JSON.stringify(reports[0], null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabla difusion_data */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tabla: difusion_data</h2>
          
          {dataError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">
                <strong>Error:</strong> {dataError}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-green-600 text-sm">✅ Conexión exitosa</p>
              <p className="text-gray-600 text-sm">Registros encontrados: {data.length}</p>
              {data.length > 0 && (
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Primer registro:</p>
                  <pre className="text-xs text-gray-700">{JSON.stringify(data[0], null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-800 font-semibold mb-2">Instrucciones:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Si hay errores, las tablas no existen en Supabase</li>
          <li>• Necesitas crear las tablas: difusion_report y difusion_data</li>
          <li>• Una vez creadas, la funcionalidad de difusión funcionará</li>
        </ul>
      </div>
    </div>
  );
}
