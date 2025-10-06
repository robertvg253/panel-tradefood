import { useState } from "react";
import { Link, useLocation, Form } from "react-router";

interface SidebarProps {
  user: {
    email?: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  agents?: Array<{
    id: string;
    desarrollo_id: string;
  }>;
}

export default function Sidebar({ user, agents = [] }: SidebarProps) {
  const location = useLocation();
  const [isCampanasOpen, setIsCampanasOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isCampanasActive = () => {
    return location.pathname.startsWith('/campanas');
  };

  return (
    <div className="fixed left-0 top-0 w-64 bg-white h-screen flex flex-col shadow-lg z-10">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 text-center">
        <div className="flex justify-center mb-4">
          <img 
            src="/logo-tradefood.jpeg" 
            alt="Trade Food Logo" 
            className="w-16 h-16 object-contain"
          />
        </div>
        <h1 className="text-lg font-bold text-gray-900">
          Panel Administrativo
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {/* Dashboard */}
          <li>
            <Link
              to="/dashboard"
              className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive("/dashboard")
                  ? "text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              style={isActive("/dashboard") ? { backgroundColor: '#7B1E21' } : {}}
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"
                />
              </svg>
              Dashboard
            </Link>
          </li>

          {/* Agente IA */}
          <li>
            <Link
              to="/agente"
              className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive("/agente")
                  ? "text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              style={isActive("/agente") ? { backgroundColor: '#7B1E21' } : {}}
            >
              <svg
                className="w-5 h-5 mr-3"
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
              Agente IA
            </Link>
          </li>

          {/* Historial */}
          <li>
            <Link
              to="/historial"
              className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive("/historial")
                  ? "text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              style={isActive("/historial") ? { backgroundColor: '#7B1E21' } : {}}
            >
              <svg
                className="w-5 h-5 mr-3"
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
              Historial
            </Link>
          </li>

          {/* Campañas - Menú Desplegable */}
          <li>
            <button
              onClick={() => setIsCampanasOpen(!isCampanasOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-200 ${
                isCampanasActive()
                  ? "text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              style={isCampanasActive() ? { backgroundColor: '#7B1E21' } : {}}
            >
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Campañas
              </div>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${
                  isCampanasOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            
            {/* Submenú de Campañas */}
            {isCampanasOpen && (
              <ul className="ml-4 mt-2 space-y-1">
                <li>
                  <Link
                    to="/campanas/difusion"
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 text-sm ${
                      isActive("/campanas/difusion")
                        ? "text-white"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    style={isActive("/campanas/difusion") ? { backgroundColor: '#7B1E21' } : {}}
                  >
                    <svg
                      className="w-4 h-4 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Difusión
                  </Link>
                </li>
                <li>
                  <Link
                    to="/campanas/analitica"
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 text-sm ${
                      isActive("/campanas/analitica")
                        ? "text-white"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    style={isActive("/campanas/analitica") ? { backgroundColor: '#7B1E21' } : {}}
                  >
                    <svg
                      className="w-4 h-4 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    Analítica
                  </Link>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </nav>

        {/* Footer - Usuario y Cerrar Sesión */}
        <div className="p-4 border-t border-gray-200">
          {/* Información del Usuario */}
          <div className="mb-4 text-center">
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">
                {user.user_metadata?.full_name || "Usuario"}
              </p>
              <p className="text-gray-500 text-xs">{user.email}</p>
            </div>
          </div>
          
          {/* Botón Cerrar Sesión */}
          <Form method="post" action="/logout">
            <button
              type="submit"
              className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors duration-200"
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Cerrar Sesión
            </button>
          </Form>
        </div>
    </div>
  );
}
