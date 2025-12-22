import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '.dark'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Override all gray colors with black/dark variants
        gray: {
          50: '#0a0a0a',    // Almost black
          100: '#141414',   // Very dark gray
          200: '#1a1a1a',   // Dark gray
          300: '#262626',   // Medium-dark gray
          400: '#333333',   // Medium gray
          500: '#404040',   // Mid gray
          600: '#4d4d4d',   // Light-medium gray
          700: '#595959',   // Light gray
          800: '#0d0d0d',   // Very dark (for cards/surfaces)
          850: '#0f0f0f',   // Between 800 and 900
          900: '#050505',   // Near black (for backgrounds)
          950: '#020202',   // Deepest black
        },
      },
    },
  },
  plugins: [],
};

export default config;