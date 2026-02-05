/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e88e5',
        dark: '#0e1117',
        darker: '#0a0a0f',
        card: '#1a1a2e',
      },
    },
  },
  plugins: [],
}
