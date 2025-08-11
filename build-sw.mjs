import { generateSW } from 'workbox-build';
const { count, size } = await generateSW({
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,css,png,svg,webmanifest,json}'],
  swDest: 'dist/sw.js',
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    { urlPattern: ({request}) => request.destination === 'document', handler: 'NetworkFirst', options: { cacheName: 'html' } },
    { urlPattern: ({request}) => ['style','script','image','font'].includes(request.destination), handler: 'StaleWhileRevalidate', options: { cacheName: 'assets' } }
  ]
});
console.log(`Precached ${count} files, ~${size} bytes`);
