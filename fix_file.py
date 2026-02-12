file_path = 'c:/Users/Engineer Kairo Maina/Desktop/Kairo 4K-Streamer-/src/components/admin/VirtualChannelManager.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the corrupted content - literal \n strings (backslash followed by n)
content = content.replace('                \\n', '        }')
content = content.replace('        \\n// Remove undefined values', '        // Remove undefined values')
content = content.replace('                \\n\\n        // Remove undefined values', '        }\\n\\n        // Remove undefined values')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('File fixed!')
