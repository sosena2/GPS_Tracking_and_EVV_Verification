/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          500: '#34d399',
          600: '#22c55e',
          700: '#16a34a',
          900: '#14532d',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
}