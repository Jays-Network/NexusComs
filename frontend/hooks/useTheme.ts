import { Colors } from "@/constants/theme";
import { useThemeMode } from "@/contexts/ThemeContext";

export function useTheme() {
  const { effectiveTheme } = useThemeMode();
  const isDark = effectiveTheme === "dark";
  const theme = Colors[effectiveTheme];

  return {
    theme,
    isDark,
  };
}
