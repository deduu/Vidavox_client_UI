/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html", // your Vite root HTML
    "./src/**/*.{js,jsx,ts,tsx}", // all React/Vite source files
  ],
  theme: {
    extend: {}, // put customisations here
  },
  plugins: [require("@tailwindcss/typography")],
};
