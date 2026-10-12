"use client";

import { useEffect, useId, useRef } from "react";
import type { Feedback } from "../lib/feedback";
import { monadTestnet } from "../../../packages/shared/chain";
import { ConfianceMark } from "./logo";

export function MessageModal({
  message,
  title,
  nextStep,
  transactionHash,
  tone = "success",
  onDismiss,
}: Feedback & {
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
      className={`message-modal message-modal-${tone}`}
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

      <div className="message-modal-heading-icons" aria-hidden="true">
        <ConfianceMark size={32} />
        <div className="message-modal-icon" aria-hidden="true">
          {tone === "success" ? "✓" : tone === "info" ? "i" : "!"}
        </div>
      </div>

      <p className="eyebrow">CONFIANCE</p>
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId} className="message-modal-description">
        {message}
      </p>

      {nextStep && <p className="message-modal-next">{nextStep}</p>}

      {transactionHash && /^0x[0-9a-f]{64}$/i.test(transactionHash) && (
        <a
          className="message-modal-proof"
          href={`${monadTestnet.blockExplorers.default.url}/tx/${transactionHash}`}
          target="_blank"
          rel="noreferrer"
        >
          View verified transaction on Monad Explorer ↗
        </a>
      )}

      <button className="message-modal-dismiss" onClick={onDismiss}>
        Got it
      </button>
    </dialog>
  );
}
