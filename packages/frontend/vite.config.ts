import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    // Add the Tailwind CSS plugin
    tailwindcss(),
  ],
})

// export default defineConfig({
//   plugins: [react()],
//   css: {
//     postcss: {
//       plugins: [
//         tailwindcss({
//           config: './tailwind.config.js', // Ensure you have a Tailwind CSS config file
//         }),
//       ],
//     },
//   },
//   server: {
//     proxy: {
//       '/api': {
//         target: 'http://localhost:5000',
//         changeOrigin: true,
//       },
//       '/socket.io': {
//         target: 'http://localhost:5000',
//         ws: true,
//       },
//     },
//   },
// });
