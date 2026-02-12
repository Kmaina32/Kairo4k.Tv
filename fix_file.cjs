const fs = require('fs');
const path = 'c:/Users/Engineer Kairo Maina/Desktop/Kairo 4K-Streamer-/src/components/admin/VirtualChannelManager.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the corrupted content - the literal \n characters
content = content.replace(/\}                \\n/g, '        }\n');
content = content.replace(/                \\n/g, '');

fs.writeFileSync(path, content);
console.log('File fixed!');
