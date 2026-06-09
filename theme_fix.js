const fs = require('fs');
let content = fs.readFileSync('public/admin.html', 'utf8');
content = content.replace(/<style>[\s\S]*?<\/style>/, `<style>
    body {
      font-family: 'Inter', sans-serif;
      background: #f0fdf4;
      min-height: 100vh;
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(22, 163, 74, 0.3);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    }
  </style>`);

content = content.replace(/text-white/g, 'text-green-900');
content = content.replace(/text-green-100/g, 'text-green-700');
content = content.replace(/text-green-200/g, 'text-green-600');
content = content.replace(/text-green-300/g, 'text-green-600');
content = content.replace(/bg-emerald-600/g, 'bg-white/70');
content = content.replace(/border-emerald-500/g, 'border-green-200');
content = content.replace(/bg-emerald-700/g, 'bg-green-50');
content = content.replace(/hover:bg-emerald-800/g, 'hover:bg-green-100');
content = content.replace(/from-emerald-900/g, 'from-white');
content = content.replace(/to-green-900/g, 'to-green-50');
content = content.replace(/text-emerald-400/g, 'text-green-600');
content = content.replace(/text-emerald-500/g, 'text-green-700');
content = content.replace(/bg-emerald-950/g, 'bg-green-100');
content = content.replace(/border-emerald-900\/30/g, 'border-green-200');

fs.writeFileSync('public/admin.html', content);
