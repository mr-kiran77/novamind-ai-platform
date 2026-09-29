/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0a0b10",
          card: "#121420",
          purple: "#8b5cf6",
          cyan: "#06b6d4",
          accent: "#a78bfa"
        }
      }
    },
  },
  plugins: [],
}
