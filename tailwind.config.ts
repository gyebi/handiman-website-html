import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        road: "#283618",
        safety: "#f2c14e",
        service: "#2a9d8f",
        alert: "#c1121f",
        surface: "#f8fafc",
      },
    },
  },
  plugins: [],
};

export default config;
