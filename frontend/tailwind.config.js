/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'], // Suggesting a rounder, friendly font
      },
      colors: {
        scout: {
          cream: '#FDFBF7',    // The background color of your logo
          dark: '#2D3748',     // The dark grey/blue of the text/circle
          gold: '#E6AA68',     // The compass needle gold
          'gold-light': '#F9EDD6', // Lighter gold for hover states
          blue: '#34495E',     // The dark needle part
          mint: '#E0F2F1',     // A complementary pastel
          'mint-dark': '#26A69A',
        }
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar'), // Make sure to run: npm install tailwind-scrollbar
  ],
}