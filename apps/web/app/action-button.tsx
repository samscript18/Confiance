"use client";
import type { ComponentProps } from "react";

export function ActionButton({
  pending,
  pendingLabel,
  children,
  disabled,
  className = "",
  ...props
}: ComponentProps<"button"> & { pending: boolean; pendingLabel: string }) {
  return (
    <button
      {...props}
      disabled={disabled || pending}
      aria-busy={pending}
      className={`action-button ${className}`}
    >
      {pending && <span className="button-spinner" aria-hidden="true" />}
      {pending ? pendingLabel : children}
    </button>
  );
}
