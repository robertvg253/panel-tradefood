import { createClient } from '@supabase/supabase-js'
import { env, validateEnv, logConfig } from '~/config/env'

// Configuración del servidor para Supabase
// Este archivo se usa en las funciones action/loader que se ejecutan en el servidor

// Validar configuración
try {
  validateEnv();
  logConfig();
} catch (error) {
  console.error('❌ Error en la configuración:', error);
  throw error;
}

// Crear y exportar la instancia del cliente de Supabase para el servidor
export const supabaseServer = createClient(env.supabase.url!, env.supabase.serviceRoleKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'Authorization': `Bearer ${env.supabase.serviceRoleKey}`,
    },
  },
})

// Cliente con bypass de RLS para operaciones administrativas
export const supabaseAdmin = createClient(env.supabase.url!, env.supabase.serviceRoleKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'Authorization': `Bearer ${env.supabase.serviceRoleKey}`,
    },
  },
  db: {
    schema: 'public'
  }
})

// Exportar tipos útiles de Supabase
export type { User, Session } from '@supabase/supabase-js'
