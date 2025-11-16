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
          50: '#e6f7f3',
          100: '#b3e6d9',
          200: '#80d5bf',
          300: '#4dc4a5',
          400: '#4ecca3',
          500: '#3aa78d',
          600: '#2d8670',
          700: '#206554',
          800: '#134338',
          900: '#06221c',
        },
        dark: {
          900: '#1a1a2e',
          800: '#16213e',
          700: '#0f3460',
        }
      },
    },
  },
  plugins: [],
}
