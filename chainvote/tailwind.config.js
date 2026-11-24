module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { navy: { 950: "#070b1a", 900: "#0b1224", 800: "#111a33", 700: "#1a2547" }, indigo: { 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5" }, emerald: { 400: "#34d399", 500: "#10b981" } }, fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"], mono: ["var(--font-mono)", "monospace"] } } },
  plugins: [],
};
