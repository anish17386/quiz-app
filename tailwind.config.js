/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        slido: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b8dcff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        brandGreen: '#10b981',
        brandRed: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
