import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "./Button";
import { IconClose } from "./icons";
import { useI18n } from "../i18n/context";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Accessible modal on top of the native <dialog>: the browser provides focus
 * trapping, Esc-to-close, an inert background and focus restoration.
 */
export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const { m } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    // The dialog unmounts when closed, so restore focus to the opener ourselves.
    const opener = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    // React's autoFocus runs before the dialog is visible, so focus here instead.
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => opener?.focus?.();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        // Let React own the open state instead of the browser.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-sm text-ink-soft">
                {description}
              </p>
            )}
          </div>
          <IconButton label={m.common.close} size="sm" onClick={onClose} className="-me-2">
            <IconClose width={18} height={18} />
          </IconButton>
        </div>
        <div className="px-6 py-3">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 px-6 pb-5 pt-3">{footer}</div>}
      </div>
    </dialog>
  );
}
