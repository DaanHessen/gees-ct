import clsx from "clsx";
import type { CSSProperties } from "react";

type SpinnerProps = {
  size?: number;
  className?: string;
};

export function Spinner({ size = 28, className }: SpinnerProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
  };
  return (
    <span
      className={clsx(
        "inline-block animate-spin rounded-full border-2 border-white/30 border-t-white",
        className,
      )}
      style={style}
      aria-label="Laden"
    />
  );
}
