import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F3EEE3",
        "paper-2": "#FBF7EE",
        "paper-3": "#E7DFCD",
        ink: "#191710",
        "ink-soft": "#575145",
        "ink-faint": "#8B8474",
        line: "rgba(25, 23, 16, 0.18)",
        accent: "#B0391C",
        "accent-dark": "#8B2B12",
        olive: "#3D4A32",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        slip: "0 22px 44px -30px rgba(25, 23, 16, 0.55)",
      },
      letterSpacing: {
        label: "0.16em",
      },
    },
  },
  plugins: [],
};

export default config;
