import { type ActionFunctionArgs, redirect } from "react-router";
import { supabaseServer } from "~/supabase/supabaseServer";

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Cerrar sesión en el servidor
    await supabaseServer.auth.signOut();
    
    // Redirigir a la página de login
    return redirect("/");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    // Redirigir de todas formas
    return redirect("/");
  }
}

// No necesitamos un componente para esta ruta, solo la acción
export default function LogoutPage() {
  return null;
}
