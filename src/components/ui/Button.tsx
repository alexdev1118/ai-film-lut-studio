import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode;
  readonly variant?: "primary" | "secondary" | "ghost";
}

export const Button = ({ children, variant = "primary", className = "", type = "button", ...props }: ButtonProps) => {
  return (
    <button className={`btn btn-${variant} ${className}`.trim()} type={type} {...props}>
      {children}
    </button>
  );
};
