import { Link } from "react-router";

export default function TestsIndexPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-4">Página de Pruebas</h1>
      <p className="text-gray-300 mb-6">
        Esta página contiene enlaces a todas las pruebas disponibles del sistema.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          to="/tests/db" 
          className="block bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-lg text-center transition-colors"
        >
          🧪 Prueba de Base de Datos
        </Link>
        
        <Link 
          to="/tests/agente" 
          className="block bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg text-center transition-colors"
        >
          🤖 Prueba de Agente Tradefood
        </Link>
      </div>
    </div>
  );
}
