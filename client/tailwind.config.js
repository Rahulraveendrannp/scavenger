/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'heading': ['TT_Commons_Pro_ExtraBold'],
        'body': ['TT_Commons_Pro_DemiBold'],
        'demi': ['TT_Commons_Pro_DemiBold'],
        'extrabold': ['TT_Commons_Pro_ExtraBold'],
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
