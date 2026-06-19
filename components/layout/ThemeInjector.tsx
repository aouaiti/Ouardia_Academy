import type { AppSettings } from "@/lib/types";

export function ThemeInjector({ settings }: { settings: AppSettings }) {
  const css = `:root {
    --primary: ${settings.primary_color};
    --primary-dark: ${settings.primary_dark};
    --primary-light: ${settings.primary_light};
  }`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
