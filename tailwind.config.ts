import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        halifaq: {
          teal: "#0F6E6E",
          coral: "#FF6B5E",
        },
      },
    },
  },
  plugins: [],
};

export default config;
