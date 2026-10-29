"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  visibilityLabel?: string;
};

export function PasswordInput({
  id,
  className,
  style,
  visibilityLabel = "password",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const toggleLabel = `${visible ? "Sembunyikan" : "Tampilkan"} ${visibilityLabel}`;

  return (
    <span style={{ position: "relative", display: "block", width: "100%" }}>
      <input
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...props}
        className={className}
        style={{
          ...style,
          display: "block",
          boxSizing: "border-box",
          width: "100%",
          minHeight: 44,
          paddingRight: 48,
        }}
        id={inputId}
        type={visible ? "text" : "password"}
      />
      <button
        type="button"
        className="icon-btn"
        style={{
          position: "absolute",
          right: 4,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          padding: 0,
          border: 0,
          background: "transparent",
          color: "var(--muted, #6f7080)",
        }}
        aria-label={toggleLabel}
        title={toggleLabel}
        aria-controls={inputId}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <EyeOff size={18} aria-hidden="true" />
        ) : (
          <Eye size={18} aria-hidden="true" />
        )}
      </button>
    </span>
  );
}
