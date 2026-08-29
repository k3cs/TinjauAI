/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        edge: "rgb(var(--edge) / <alpha-value>)",
        proven: "rgb(var(--proven) / <alpha-value>)",
        hurts: "rgb(var(--hurts) / <alpha-value>)",
        bound: "rgb(var(--bound) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      keyframes: { print: { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "none" } } },
      animation: { print: "print .35s ease-out both" },
    },
  },
  plugins: [],
};
