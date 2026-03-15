import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#00D4FF',
                'primary-dark': '#0088CC',
                xp: '#FFB800',
                streak: '#FF3D71',
            },
        },
    },
    plugins: [],
};

export default config;
