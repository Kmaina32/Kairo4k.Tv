
import os
import requests
import threading
from queue import Queue
import time

# --- CONFIGURATION ---
INPUT_M3U = "input_streams.m3u"
THREADS = 30  # High concurrency for 180+ streams
TIMEOUT = 10   # Extended timeout for global signals

# Output Categories
CAT_ULTRA = "working_ultra_fast.m3u" # < 500ms
CAT_STABLE = "working_stable.m3u"   # 500ms - 2s
CAT_SLOW = "working_slow.m3u"       # > 2s
CAT_OFFLINE = "offline_signals.m3u"

def parse_m3u(file_path):
    streams = []
    if not os.path.exists(file_path):
        return streams
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    current_metadata = None
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#EXTM3U"): continue
        if line.startswith("#EXTINF"):
            current_metadata = line
        elif not line.startswith("#"):
            streams.append({"metadata": current_metadata, "url": line})
            current_metadata = None
    return streams

def check_stream(stream_obj, results_queue, task_queue):
    url = stream_obj['url']
    start_time = time.time()
    try:
        # Use stream=True to only check headers and avoid downloading full content
        response = requests.get(url, timeout=TIMEOUT, stream=True, verify=False)
        latency = (time.time() - start_time) * 1000 # convert to ms
        
        if response.status_code == 200:
            stream_obj['latency'] = latency
            stream_obj['status'] = 'online'
            print(f"[ONLINE] {latency:4.0f}ms | {url[:60]}...")
            results_queue.put(stream_obj)
        else:
            stream_obj['status'] = 'offline'
            stream_obj['reason'] = f"HTTP {response.status_code}"
            print(f"[OFFLINE] {response.status_code} | {url[:60]}...")
            results_queue.put(stream_obj)
    except Exception as e:
        stream_obj['status'] = 'offline'
        stream_obj['reason'] = "Connection Error"
        print(f"[ERROR]   FAIL | {url[:60]}...")
        results_queue.put(stream_obj)
    finally:
        task_queue.task_done()

def save_m3u(file_path, streams):
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write("#EXTM3U\n")
        # Sort by latency if they are working
        working = [s for s in streams if 'latency' in s]
        working.sort(key=lambda x: x['latency'])
        
        for s in working + [s for s in streams if 'latency' not in s]:
            meta = s['metadata'] if s['metadata'] else f"#EXTINF:-1,Node"
            if 'latency' in s:
                meta += f" [LATENCY: {s['latency']:.0f}ms]"
            f.write(f"{meta}\n{s['url']}\n")

def worker(results_queue, task_queue):
    while True:
        stream = task_queue.get()
        if stream is None: break
        check_stream(stream, results_queue, task_queue)

def main():
    print("\n" + "="*50)
    print(" KAIRO 4K: SIGNAL PERFORMANCE AUDIT ")
    print("="*50)
    
    streams = parse_m3u(INPUT_M3U)
    if not streams:
        print("No streams found in input_streams.m3u")
        return

    print(f"Initializing audit for {len(streams)} signals...")
    
    task_queue = Queue()
    results_queue = Queue()

    for _ in range(THREADS):
        t = threading.Thread(target=worker, args=(results_queue, task_queue))
        t.daemon = True
        t.start()

    for s in streams:
        task_queue.put(s)

    # Progression monitoring
    processed = 0
    all_results = []
    
    # Wait for all tasks in a loop so we can collect results as they come
    while processed < len(streams):
        result = results_queue.get()
        all_results.append(result)
        processed += 1
        if processed % 10 == 0:
            print(f"Progress: {processed}/{len(streams)} nodes audited...")

    task_queue.join()

    # Categorize
    ultra = [s for s in all_results if s.get('status') == 'online' and s['latency'] < 500]
    stable = [s for s in all_results if s.get('status') == 'online' and 500 <= s['latency'] < 2000]
    slow = [s for s in all_results if s.get('status') == 'online' and s['latency'] >= 2000]
    offline = [s for s in all_results if s.get('status') == 'offline']

    # Save files
    save_m3u(CAT_ULTRA, ultra)
    save_m3u(CAT_STABLE, stable)
    save_m3u(CAT_SLOW, slow)
    save_m3u(CAT_OFFLINE, offline)

    print("\n" + "="*50)
    print(" AUDIT RESULTS SUMMARY")
    print("="*50)
    print(f"TOTAL NODES:    {len(all_results)}")
    print(f"ULTRA FAST:     {len(ultra)} (Saved to {CAT_ULTRA})")
    print(f"STABLE:         {len(stable)} (Saved to {CAT_STABLE})")
    print(f"SLOW/BUFF:      {len(slow)} (Saved to {CAT_SLOW})")
    print(f"OFFLINE:        {len(offline)} (Saved to {CAT_OFFLINE})")
    print("="*50)
    
    if ultra:
        print("\nTOP 3 FASTEST NODES:")
        for i, s in enumerate(ultra[:3]):
            print(f"{i+1}. {s['latency']:4.0f}ms | {s['url'][:60]}...")

if __name__ == "__main__":
    from requests.packages.urllib3.exceptions import InsecureRequestWarning
    requests.packages.urllib3.disable_warnings(InsecureRequestWarning)
    main()
