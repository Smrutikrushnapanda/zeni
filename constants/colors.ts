export const DarkTheme = {
  background: "#222222ff",
  surface: "#2F2F2F",
  text: "#ECECEC",
  mutedText: "#8E8EA0",
  primary: "#10A37F",
  secondary: "#0E8F6E",
  accent: "#10A37F",
  danger: "#EF4444",
  success: "#22C55E",
  warning: "#FACC15",
  border: "#3E3E3E",
  headerBackground: "#1E1E1ECC",
};

export const LightTheme = {
  background: "#FFFFFF",
  surface: "#F4F4F4",
  text: "#0D0D0D",
  mutedText: "#6E6E80",
  primary: "#10A37F",
  secondary: "#0E8F6E",
  accent: "#19C37D",
  danger: "#DC2626",
  success: "#16A34A",
  warning: "#CA8A04",
  border: "#E5E5E5",
  headerBackground: "#FFFFFFCC",
};

export type ThemeType = typeof DarkTheme;

export const Themes = {
  dark: DarkTheme,
  light: LightTheme,
};

export type ThemeMode = "dark" | "light";