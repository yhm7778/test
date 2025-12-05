import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: "var(--color-primary-50)",
                    100: "var(--color-primary-100)",
                    200: "var(--color-primary-200)",
                    300: "var(--color-primary-300)",
                    400: "var(--color-primary-400)",
                    500: "var(--color-primary-500)",
                    600: "var(--color-primary-600)",
                    700: "var(--color-primary-700)",
                    800: "var(--color-primary-800)",
                    900: "var(--color-primary-900)",
                },
            },
            fontFamily: {
                sans: ["var(--font-inter)", "var(--font-noto-sans-kr)", "sans-serif"],
            },
            animation: {
                "fade-in": "fadeIn 0.5s ease-out forwards",
                "slide-up": "slideUp 0.5s ease-out forwards",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [
        plugin(function ({ addUtilities }) {
            addUtilities({
                ".scrollbar-hide": {
                    /* IE and Edge */
                    "-ms-overflow-style": "none",
                    /* Firefox */
                    "scrollbar-width": "none",
                    /* Safari and Chrome */
                    "&::-webkit-scrollbar": {
                        display: "none",
                    },
                },
            });
        }),
    ],
};
export default config;
