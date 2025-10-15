/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
            },
            colors: {
                background: '#ffffff',
                surface: {
                    DEFAULT: '#f8fafc',
                    hover: '#f1f5f9'
                },
                stroke: {
                    DEFAULT: '#e2e8f0',
                    hover: '#cbd5e1'
                },
                button: {
                    DEFAULT: '#3b82f6',
                    hover: '#2563eb'
                },
                text: {
                    primary: '#1e293b',
                    secondary: '#64748b',
                    muted: '#94a3b8'
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}