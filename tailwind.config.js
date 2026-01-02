/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html", // your Vite root HTML
    "./src/**/*.{js,jsx,ts,tsx}", // all React/Vite source files
  ],
  theme: {
    extend: {
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "pulse-slow": "pulse 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      },
    },
  },

  plugins: [require("@tailwindcss/typography")],
};
