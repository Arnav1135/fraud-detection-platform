/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'google-blue': '#1a73e8',
        'google-red': '#ea4335',
        'google-yellow': '#fbbc04',
        'google-green': '#34a853',
        'dark-bg': '#121212',
        'dark-surface': '#1e1e1e',
      }
    },
  },
  plugins: [],
}
