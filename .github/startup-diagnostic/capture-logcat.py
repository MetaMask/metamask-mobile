#!/usr/bin/env python3
"""Capture filtered native/JS evidence after the designated emulator is available."""
from pathlib import Path
import json
import signal
import subprocess
import sys
import threading
import time
from importlib.util import module_from_spec, spec_from_file_location

package = Path(__file__).resolve().parent
spec = spec_from_file_location('diagnostic_filter', package / 'filter-diagnostic-log.py')
module = module_from_spec(spec)
spec.loader.exec_module(module)
serial, destination = sys.argv[1:3]
destination = Path(destination)
process = None
stopped = False
summary = {'schemaVersion': 1, 'serial': serial, 'captureStatus': 'waiting-for-device',
           'inputLines': 0, 'retainedLines': 0, 'stderrReadChunks': 0,
           'stderrOmittedChunks': 0, 'stderrFilteredLines': [], 'stderrTruncated': False}


def capture_stderr(stream):
    """Drain stderr; retain at most 20 source-only frames or fixed markers."""
    while chunk := stream.readline(1801):
        summary['stderrReadChunks'] += 1
        if len(chunk.rstrip('\r\n')) > 1800:
            summary['stderrTruncated'] = True
            summary['stderrOmittedChunks'] += 1
            # Do not interpret the tail of an oversized line as a new message.
            while chunk and not chunk.endswith('\n'):
                chunk = stream.readline(1801)
                if chunk:
                    summary['stderrReadChunks'] += 1
            continue
        result = module.filtered(chunk)
        if 'invalid filter expression' in chunk.lower():
            result = 'logcat invalid filter expression'
        if result is None:
            summary['stderrOmittedChunks'] += 1
        elif len(summary['stderrFilteredLines']) < 20:
            summary['stderrFilteredLines'].append(result)
        else:
            summary['stderrTruncated'] = True

def save_summary():
    (destination.parent / 'logcat-capture.json').write_text(json.dumps(summary, indent=2) + '\n')

def stop(_signum, _frame):
    global stopped
    stopped = True
    if process is not None and process.poll() is None:
        process.terminate()

signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
deadline = time.monotonic() + 600
while not stopped and time.monotonic() < deadline:
    try:
        probe = subprocess.run(['adb', '-s', serial, 'get-state'], capture_output=True, text=True, timeout=5)
    except subprocess.TimeoutExpired:
        time.sleep(1)
        continue
    except FileNotFoundError:
        summary['captureStatus'] = 'adb-unavailable'
        save_summary()
        sys.exit(2)
    if probe.returncode == 0 and probe.stdout.strip() == 'device':
        break
    time.sleep(1)
else:
    summary['captureStatus'] = 'stopped-before-device' if stopped else 'device-unavailable'
    save_summary()
    sys.exit(0 if stopped else 2)

if stopped:
    summary['captureStatus'] = 'stopped-before-capture'
    save_summary()
    sys.exit(0)

process = subprocess.Popen([
    'adb', '-s', serial, 'logcat', '-b', 'main', '-b', 'system', '-b', 'crash',
    '-v', 'threadtime', 'AndroidRuntime:E', 'ReactNativeJS:V', 'ReactNative:E',
    'ReactNativeJNI:E', 'SoLoader:E', 'Hermes:E',
    # Error fallback also covers tags containing colons, which filter rules cannot express.
    'ActivityManager:I', 'libc:F', 'DEBUG:E', '*:E',
], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
stderr_thread = threading.Thread(target=capture_stderr, args=(process.stderr,), daemon=True)
stderr_thread.start()
summary['captureStatus'] = 'reading'
with destination.open('w') as output:
    output.write('Filtered native/JS diagnostic log; arbitrary error values omitted.\n')
    output.flush()
    try:
        for line in process.stdout:
            summary['inputLines'] += 1
            result = module.filtered(line)
            if result is not None:
                summary['retainedLines'] += 1
                output.write(result + '\n')
                output.flush()
    finally:
        if process.poll() is None:
            process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        stderr_thread.join(timeout=10)
        summary['stderrCaptureComplete'] = not stderr_thread.is_alive()
        summary['captureStatus'] = 'stopped-after-capture' if stopped else 'logcat-exited'
        summary['logcatExitCode'] = process.returncode
        save_summary()
