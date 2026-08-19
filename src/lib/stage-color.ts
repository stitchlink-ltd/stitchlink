import {
  Layers,
  Package,
  PackageCheck,
  Palette,
  Ruler,
  Scissors,
  Shirt,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const stageColors: Record<string, string> = {
  design: "bg-blue",
  materials: "bg-blue",
  cutting: "bg-blue",
  sewing: "bg-wine",
  fitting: "bg-wine",
  finishing: "bg-gold",
  ready: "bg-sage",
  shipped: "bg-sage",
  delivered: "bg-sage",
};

const stageIcons: Record<string, LucideIcon> = {
  design: Palette,
  materials: Layers,
  cutting: Scissors,
  sewing: Shirt,
  fitting: Ruler,
  finishing: Sparkles,
  ready: PackageCheck,
  shipped: Package,
  delivered: PackageCheck,
};

// Written as full literal class strings (not built with template interpolation) so
// Tailwind's source scanner can find every one of them, including bg-gold/10, which
// otherwise appears nowhere else in the codebase for the scanner to pick up.
const stageIconClassMap: Record<string, string> = {
  design: "bg-blue/10 text-blue",
  materials: "bg-blue/10 text-blue",
  cutting: "bg-blue/10 text-blue",
  sewing: "bg-wine/10 text-wine",
  fitting: "bg-wine/10 text-wine",
  finishing: "bg-gold/10 text-gold",
  ready: "bg-sage/10 text-sage",
  shipped: "bg-sage/10 text-sage",
  delivered: "bg-sage/10 text-sage",
};

export function stageProgressColor(stage: string) {
  return stageColors[stage.toLowerCase()] ?? "bg-wine";
}

export function stageIcon(stage: string): LucideIcon {
  return stageIcons[stage.toLowerCase()] ?? Scissors;
}

export function stageIconClasses(stage: string) {
  return stageIconClassMap[stage.toLowerCase()] ?? "bg-wine/10 text-wine";
}
