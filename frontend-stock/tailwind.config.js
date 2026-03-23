/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sukha: {
          primary: '#DAFF6D',
          light: '#EFFFC3',
          peach: '#EBCAA9',
          pink: '#F6D5E3',
          cream: '#FBF1E8',
          ink: '#1F1F1F',
        },
      },
    },
  },
  plugins: [],
}

