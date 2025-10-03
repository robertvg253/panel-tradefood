// HOOK OBSOLETO - Ya no se usa el sistema de múltiples agentes
// Solo tenemos un agente Tradefood gestionado directamente en /agente

import { useState } from "react";

export interface Agent {
  id: string;
  name: string;
  version_number?: number;
  created_at?: string;
  updated_at?: string;
}

// Hook simplificado para el agente Tradefood
export function useAgents() {
  const [agents] = useState<Agent[]>([]); // Array vacío ya que solo tenemos un agente
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  return {
    agents,
    loading,
    error,
    fetchAgents: async () => {}, // Función vacía
    createAgent: async () => { throw new Error('No se pueden crear múltiples agentes'); },
    updateAgent: async () => { throw new Error('Use /agente para editar el agente Tradefood'); },
    deleteAgent: async () => { throw new Error('No se puede eliminar el agente Tradefood'); }
  };
}
