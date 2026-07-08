import type { ReactNode } from "react";

interface GlassCardProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export const GlassCard = ({ children, className = "" }: GlassCardProps) => {
  return <section className={`glass-card ${className}`.trim()}>{children}</section>;
};
