file_path = 'c:/Users/Engineer Kairo Maina/Desktop/Geniues-Streamer-/src/components/admin/VirtualChannelManager.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the corrupted pattern
idx = content.find('                }')
if idx != -1:
    print(f"Found pattern at index {idx}")
    print(f"Context: {repr(content[idx:idx+100])}")
else:
    print("Pattern not found")

# Also check for literal backslash-n
if '\\n' in content:
    print("Found literal \\n in file")
    # Count occurrences
    count = content.count('\\n')
    print(f"Found {count} occurrences of literal \\n")
else:
    print("No literal \\n found")
