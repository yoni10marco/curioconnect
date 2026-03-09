import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#58CC02',
                'primary-dark': '#46A302',
                xp: '#FFC800',
                streak: '#FF9600',
            },
        },
    },
    plugins: [],
};

export default config;
