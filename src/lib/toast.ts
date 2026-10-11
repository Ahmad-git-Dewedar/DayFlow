import { createContext, useContext } from "react";

export type ToastInput = {
  message: string;
  /** Optional single action, e.g. Undo. */
  action?: { label: string; onClick: () => void };
  tone?: "default" | "success";
};

export type ToastApi = { show: (t: ToastInput) => void };

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const v = useContext(ToastContext);
  if (!v) throw new Error("useToast must be used inside <ToastProvider>");
  return v;
}
