import { Platform } from "react-native";

const tintColorLight = "#D4AF37";
const tintColorDark = "#E8D5A8";

export const Colors = {
  light: {
    text: "#1a1a1a",
    textSecondary: "#666666",
    textDisabled: "#999999",
    buttonText: "#FFFFFF",
    tabIconDefault: "#666666",
    tabIconSelected: tintColorLight,
    link: "#D4AF37",
    primary: "#D4AF37",
    primaryLight: "#E8D5A8",
    primaryDark: "#B8942F",
    emergency: "#DC2626",
    emergencyLight: "#FEE2E2",
    success: "#16A34A",
    warning: "#F59E0B",
    backgroundRoot: "#FFFFFF",
    backgroundSecondary: "#f5f5f5",
    surface: "#e8e8e8",
    border: "#d0d0d0",
    messageSent: "#D4AF37",
    messageReceived: "#e8e8e8",
    messageEmergency: "#DC2626",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#b0b0b0",
    textDisabled: "#808080",
    buttonText: "#FFFFFF",
    tabIconDefault: "#b0b0b0",
    tabIconSelected: tintColorDark,
    link: "#E8D5A8",
    primary: "#D4AF37",
    primaryLight: "#E8D5A8",
    primaryDark: "#B8942F",
    emergency: "#EF4444",
    emergencyLight: "#7F1D1D",
    success: "#22C55E",
    warning: "#FBBF24",
    backgroundRoot: "#1a1a1a",
    backgroundSecondary: "#2a2a2a",
    surface: "#3a3a3a",
    border: "#4a4a4a",
    messageSent: "#D4AF37",
    messageReceived: "#3a3a3a",
    messageEmergency: "#DC2626",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
