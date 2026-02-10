import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cacao: {
          DEFAULT: '#5D4037',
          light: '#8B6B61',
          dark: '#3E2723',
          cream: '#FFF8E1',
        },
        healthy: '#2ECC71',
        moniliasis: '#F39C12',
        'black-pod': '#E74C3C',
      },
    },
  },
  plugins: [],
} satisfies Config;
