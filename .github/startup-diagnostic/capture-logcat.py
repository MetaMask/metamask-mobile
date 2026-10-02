#!/usr/bin/env python3
"""Capture filtered native/JS evidence after the designated emulator is available."""
from pathlib import Path
import json
import signal
import subprocess
import sys
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
           'inputLines': 0, 'retainedLines': 0}

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
    'ReactNativeJNI:E', 'unknown:ReactNative:E', 'SoLoader:E', 'Hermes:E',
    'ActivityManager:I', 'libc:F', 'DEBUG:E', '*:S',
], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
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
        summary['captureStatus'] = 'stopped-after-capture' if stopped else 'logcat-exited'
        summary['logcatExitCode'] = process.returncode
        save_summary()
