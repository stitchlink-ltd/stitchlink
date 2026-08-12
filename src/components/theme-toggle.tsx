"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const storageKey = "stitchlink-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(storageKey, theme);
}

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeToThemeChange(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToThemeChange, currentTheme, () => "light");

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="relative inline-flex h-9 w-18 items-center justify-between rounded-full border border-line bg-paper p-1"
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1 top-1 size-7 rounded-full bg-foreground transition-transform duration-300 ease-out",
          theme === "dark" ? "translate-x-9" : "translate-x-0"
        )}
      />
      <button
        type="button"
        role="radio"
        aria-checked={theme === "light"}
        onClick={() => applyTheme("light")}
        aria-label="Switch to light mode"
        title="Switch to light mode"
        className={cn(
          "relative z-10 grid size-7 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine",
          theme === "light" ? "text-paper" : "text-muted hover:text-foreground"
        )}
      >
        <Sun size={14} />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={theme === "dark"}
        onClick={() => applyTheme("dark")}
        aria-label="Switch to dark mode"
        title="Switch to dark mode"
        className={cn(
          "relative z-10 grid size-7 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine",
          theme === "dark" ? "text-paper" : "text-muted hover:text-foreground"
        )}
      >
        <Moon size={14} />
      </button>
    </div>
  );
}
