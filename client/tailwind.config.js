/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'heading': ['TT_Commons_Pro_ExtraBold', 'Arial Black', 'Helvetica Black', 'sans-serif'],
        'body': ['TT_Commons_Pro_DemiBold', 'Arial', 'Helvetica', 'sans-serif'],
        'demi': ['TT_Commons_Pro_DemiBold', 'Arial', 'Helvetica', 'sans-serif'],
        'extrabold': ['TT_Commons_Pro_ExtraBold', 'Arial Black', 'Helvetica Black', 'sans-serif'],
      },
      fontWeight: {
        'black': '900',
        'extrabold': '800',
        'bold': '700',
        'semibold': '600',
        'medium': '500',
        'normal': '400',
      }
    },
  },
  plugins: [],
}
