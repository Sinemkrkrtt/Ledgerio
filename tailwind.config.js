/** @type {import('tailwindcss').Config} */
module.exports = {
  // content kısmında App.js ve src altındaki her şeyin tarandığından emin ol
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")], 
  theme: {
    extend: {},
  },
  plugins: [],
}