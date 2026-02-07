import argparse
import requests
import concurrent.futures

def parse_m3u(content):
    """
    Parses M3U content and extracts stream URLs.
    """
    urls = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('#EXTINF:'):
            # The URL is usually the next line
            if i + 1 < len(lines):
                next_line = lines[i+1].strip()
                if next_line and not next_line.startswith('#'):
                    urls.append(next_line)
    # If no #EXTINF, maybe it's a plain list of URLs
    if not urls:
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#'):
                urls.append(line)
    return urls

def check_stream(url):
    """
    Checks if a stream URL is working.
    Returns the URL and its status ('working' or 'not working').
    """
    try:
        with requests.get(url, stream=True, timeout=5) as response:
            if response.status_code == 200:
                # Check content type for media
                content_type = response.headers.get('content-type', '').lower()
                if 'video' in content_type or 'audio' in content_type or 'octet-stream' in content_type or 'mpegurl' in content_type:
                    return url, 'working'
                else:
                    # It's a valid URL but might not be a stream
                    return url, f'not a media stream ({content_type})'
            else:
                return url, f'not working (HTTP {response.status_code})'
    except requests.exceptions.RequestException as e:
        return url, f'not working ({e.__class__.__name__})'

def main():
    parser = argparse.ArgumentParser(description='Check if stream URLs are working.')
    parser.add_argument('input_path', help='Path to a local file or URL of an M3U playlist.')
    parser.add_argument('--max-workers', type=int, default=10, help='Number of concurrent workers.')
    args = parser.parse_args()
    input_path = args.input_path

    urls = []
    if input_path.startswith('http://') or input_path.startswith('https://'):
        print(f"Downloading M3U from {input_path}...")
        try:
            response = requests.get(input_path)
            response.raise_for_status()
            m3u_content = response.text
            urls = parse_m3u(m3u_content)
            print(f"Found {len(urls)} streams in the playlist.")
        except requests.exceptions.RequestException as e:
            print(f"Error downloading M3U file: {e}")
            return
    else:
        try:
            with open(input_path, 'r') as f:
                content = f.read()
                if "#EXTM3U" in content:
                    urls = parse_m3u(content)
                else:
                    f.seek(0)
                    urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        except FileNotFoundError:
            print(f"Error: File not found at {input_path}")
            return

    if not urls:
        print("No stream URLs found.")
        return

    print(f"Checking {len(urls)} streams with {args.max_workers} workers...")

    working_streams = []
    not_working_streams = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.max_workers) as executor:
        future_to_url = {executor.submit(check_stream, url): url for url in urls}
        for future in concurrent.futures.as_completed(future_to_url):
            url, status = future.result()
            if status == 'working':
                print(f"[  OK  ] {url}")
                working_streams.append(url)
            else:
                print(f"[ FAIL ] {url} - {status}")
                not_working_streams.append((url, status))

    print(f"\n--- Results ---")
    print(f"Working streams: {len(working_streams)}")
    print(f"Not working streams: {len(not_working_streams)}")

    if working_streams:
        with open('working_streams.txt', 'w') as f:
            for url in working_streams:
                f.write(f"{url}\n")
        print("\nSaved working streams to working_streams.txt")

if __name__ == '__main__':
    main()