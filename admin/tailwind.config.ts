import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#4A7FB5',
                'primary-dark': '#2E5A8A',
                xp: '#D4A574',
                streak: '#E8878C',
            },
        },
    },
    plugins: [],
};

export default config;
