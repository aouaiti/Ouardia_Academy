import { Trophy } from "lucide-react";
import type { AppSettings } from "@/lib/types";
import { logoUrlWithCacheBust } from "@/lib/branding";

type BrandLogoSize = "sm" | "md" | "lg";

interface Props {
  settings: AppSettings;
  size?: BrandLogoSize;
  className?: string;
}

const sizeClasses: Record<BrandLogoSize, { img: string; icon: string; wrap: string }> = {
  sm: {
    wrap: "h-10 w-10",
    img: "max-h-10 max-w-10 w-auto h-auto object-contain",
    icon: "h-5 w-5",
  },
  md: {
    wrap: "h-14 w-14",
    img: "max-h-14 max-w-14 w-auto h-auto object-contain",
    icon: "h-7 w-7",
  },
  lg: {
    wrap: "w-full min-h-[140px] py-2",
    img: "max-h-48 w-auto max-w-[min(100%,360px)] h-auto object-contain",
    icon: "h-12 w-12",
  },
};

export function BrandLogo({ settings, size = "md", className = "" }: Props) {
  const logoSrc = logoUrlWithCacheBust(settings);
  const classes = sizeClasses[size];

  if (logoSrc) {
    return (
      <div className={`flex items-center justify-center ${classes.wrap} ${className}`}>
        {/* img natif : préserve transparence et proportions sans rognage */}
        <img src={logoSrc} alt={settings.app_name} className={classes.img} />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${classes.wrap} ${className}`}
      style={size !== "lg" ? { backgroundColor: `${settings.primary_color}1a` } : undefined}
    >
      <Trophy className={classes.icon} style={{ color: settings.primary_color }} />
    </div>
  );
}
