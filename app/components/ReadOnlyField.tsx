import { useState } from "react";
import Modal from "./Modal";

interface ReadOnlyFieldProps {
  label: string;
  value: string | null | undefined;
  placeholder?: string;
  isRequired?: boolean;
}

export default function ReadOnlyField({ 
  label, 
  value, 
  placeholder = "No hay información disponible", 
  isRequired = false
}: ReadOnlyFieldProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayValue = value || placeholder;
  const hasContent = value && value.trim().length > 0;

  // Todos los campos usan el mismo tono de azul
  const backgroundClass = 'bg-custom-card-bg-light/60';

  return (
    <>
      <div className="group">
        <div className={`p-4 rounded-lg transition-all duration-200 hover:bg-opacity-80 ${backgroundClass}`}>
          <label className="block text-sm font-medium text-custom-text-muted mb-3">
            {label}
          </label>
          <div className="relative">
            <div className="w-full px-3 py-2 bg-custom-bg-dark/20 rounded-md text-custom-text-light cursor-default">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${!hasContent ? 'text-custom-text-muted' : 'text-custom-text-light'}`}>
                    {displayValue}
                  </p>
                </div>
                {hasContent && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="ml-3 p-1.5 text-custom-accent hover:text-custom-accent/80 hover:bg-custom-accent/20 rounded-md transition-colors duration-200 opacity-0 group-hover:opacity-100"
                    title="Ver más"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={label}
      >
        <div className="whitespace-pre-wrap text-custom-text-light leading-relaxed text-base">
          {displayValue}
        </div>
      </Modal>
    </>
  );
}
