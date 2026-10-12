"use client";

import { useEffect, useId, useRef } from "react";

export function MessageModal({
  message,
  error,
  onDismiss,
}: {
  message: string;
  error: boolean;
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={`message-modal ${error ? "message-modal-error" : ""}`}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onDismiss();
      }}
    >
      <button
        className="message-modal-close"
        aria-label="Close message"
        onClick={onDismiss}
        autoFocus
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className="message-modal-icon" aria-hidden="true">
        {error ? "!" : "✓"}
      </div>
      <p className="eyebrow">CONFIANCE</p>
      <h2 id={titleId}>
        {error ? "Action needs attention" : "Update received"}
      </h2>
      <p id={descriptionId} className="message-modal-description">
        {message}
      </p>
      <button className="message-modal-dismiss" onClick={onDismiss}>
        Got it
      </button>
    </dialog>
  );
}
