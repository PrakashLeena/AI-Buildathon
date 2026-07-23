/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'primary-orange': '#FF5500',
        'primary-blue': '#FF8800'
      },
      fontFamily: {
        heading: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['Rajdhani', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif']
      }
    }
  },
  // The site's visual design comes from the original hand-tuned styles.css
  // (kept 1:1 to avoid changing the UI). Tailwind is layered on top for
  // resets/utilities and is available for any new markup.
  corePlugins: {
    preflight: false
  },
  plugins: []
};
