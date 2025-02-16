module.exports = {
  style: {
    postcss: {
      plugins: [
        require('postcss-nesting'),
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  webpack: {
    configure: {
      target: 'electron-renderer',
    },
  },
}; 