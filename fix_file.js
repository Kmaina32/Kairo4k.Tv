const fs = require('fs');
const path = 'c:/Users/Engineer Kairo Maina/Desktop/Kairo 4K-Streamer-/src/components/admin/VirtualChannelManager.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the corrupted addToSchedule function
const oldPattern = /        \}        \/\/ Remove undefined values to avoid Supabase errors\\n        if \(payload\.media_id === undefined\) \{ delete payload\.media_id; \}\\n        if \(payload\.ad_id === undefined\) \{ delete payload\.ad_id; \}\\n\\n        const \{ error \} = await supabase\.from\('channel_schedule'\)\.insert\(\[payload\]\);/g;
const newCode = `        }

        // Remove undefined values to avoid Supabase errors
        if (payload.media_id === undefined) { delete payload.media_id; }
        if (payload.ad_id === undefined) { delete payload.ad_id; }

        const { error } = await supabase.from('channel_schedule').insert([payload]);`;

content = content.replace(oldPattern, newCode);
fs.writeFileSync(path, content);
console.log('File fixed!');
