import { type LoaderFunctionArgs, redirect, Outlet, useLoaderData } from "react-router";
import { supabaseServer } from "~/supabase/supabaseServer";
import Layout from "~/components/Layout";

// Función para verificar autenticación en todas las rutas del layout
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await supabaseServer.auth.getSession();
  
  // Si no está autenticado, redirigir al login
  if (!session.data.session) {
    throw redirect("/");
  }

  // Ya no necesitamos cargar múltiples agentes, solo el usuario
  console.log("✅ Usuario autenticado:", session.data.session.user.email);
  
  return {
    user: session.data.session.user,
    agents: [] // Array vacío ya que solo tenemos un agente Tradefood
  };
}

export default function LayoutRoute() {
  const { user, agents } = useLoaderData<typeof loader>();
  
  return <Layout user={user} agents={agents}><Outlet /></Layout>;
}
