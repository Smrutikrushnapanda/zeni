import { ThemeMode, Themes, ThemeType } from "@/constants/colors";
import { create } from "zustand";

interface ThemeState {
  mode: ThemeMode;
  theme: ThemeType;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "dark",
  theme: Themes.dark,

  toggleTheme: () => {
    const current = get().mode;
    const next = current === "dark" ? "light" : "dark";

    set({
      mode: next,
      theme: Themes[next],
    });
  },

  setTheme: (mode) =>
    set({
      mode,
      theme: Themes[mode],
    }),
}));
