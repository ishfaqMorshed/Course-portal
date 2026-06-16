import type { Config } from "tailwindcss";

// Theme mirrors DESIGN-SYSTEM.md tokens (also exposed as CSS variables in
// app/globals.css). Color/shadow/font values match the approved Claude Design
// export's inline tailwind.config exactly; radii + upsell-intensity colors are
// added from DESIGN-SYSTEM §1/§3.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "sans-serif"],
      },
      colors: {
        canvas: "#C9CCF1",
        canvasDeep: "#C9CCF1",
        primary: "#5A60EA",
        primaryHover: "#4A50D8",
        primarySoft: "#EDEEFC",
        subtle: "#F6F7FD",
        promo: "#E3E5FA",
        textPrimary: "#1F2233",
        textSecondary: "#8A8FA8",
        line: "#ECEDF5",
        success: "#4CC38A",
        danger: "#E5484D",
        // Upsell intensity (DESIGN-SYSTEM §1)
        upsell1: "#F6F7FD",
        upsell3: "#E3E5FA",
        upsell5: "#5A60EA",
      },
      boxShadow: {
        card: "0 4px 20px rgba(90,96,234,0.08)",
        float: "0 16px 40px rgba(31,34,51,0.10)",
      },
      borderRadius: {
        // DESIGN-SYSTEM §3 shape tokens
        app: "24px",
        card: "16px",
        input: "10px",
        btn: "10px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};

export default config;
