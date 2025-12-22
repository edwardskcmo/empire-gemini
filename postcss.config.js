export default {
    plugins: {
        '@tailwindcss/postcss': {},
        autoprefixer: {}, // autoprefixer is usually included in tailwindcss/postcss but good to have if needed or just remove it if redundant. Tailwind 4 might bundle it. The error message just said install @tailwindcss/postcss.
    },
}
