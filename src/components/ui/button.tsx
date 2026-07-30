import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-wine text-white hover:bg-wine-dark border-gray-200",
  secondary: "bg-paper text-foreground hover:bg-background border-line",
  dark: "bg-ink text-white hover:bg-black border-ink",
  ghost: "bg-transparent text-foreground hover:bg-black/5 border-transparent",
};

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: keyof typeof variants;
  arrow?: boolean;
};

export function ButtonLink({
  className,
  variant = "primary",
  arrow,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
      {arrow && <ArrowUpRight size={16} aria-hidden="true" />}
    </Link>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants };

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
