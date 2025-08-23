/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'heading': ['Poppins', 'Inter', 'Arial Black', 'Helvetica Black', 'sans-serif'],
        'body': ['Inter', 'Arial', 'Helvetica', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
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
