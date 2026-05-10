/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#f4f8f3',
          100: '#e3ede1',
          200: '#c5d9c2',
          300: '#9dbf99',
          400: '#6fa06a',
          500: '#4e844a',
          600: '#3b6838',
          700: '#30542e',
          800: '#284426',
          900: '#213821',
        },
        cream: {
          50:  '#fefefb',
          100: '#faf8f2',
          200: '#f3ede0',
          300: '#e9dfc8',
          400: '#d9c9a5',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 20px 0 rgba(0,0,0,0.06)',
        card: '0 4px 32px 0 rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
