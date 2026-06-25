/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        reunion: {
          50:  '#fdf8f0',
          100: '#faefd9',
          200: '#f5ddb3',
          300: '#edc57a',
          400: '#e4a84a',
          500: '#d98f2a',
          600: '#c4741f',
          700: '#a3591b',
          800: '#84471d',
          900: '#6c3b1a',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        caveat:  ['Caveat', 'cursive'],
        kalam:   ['Kalam', 'cursive'],
        crayon:  ['PastelCrayon', 'Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
}
