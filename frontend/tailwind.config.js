/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark1': '#181818',
        'dark2': '#212121',
        'dark3': '#303030',
        // 'dark4': '#0f172a',
        'dark4': '#101720',
        'dark5': '#414141',
      }
        
    },
  },
  plugins: [],
  darkMode: 'class',
};
