#!/usr/bin/env python3
"""Keep source-only stack frames and fixed markers; omit arbitrary error values."""
import re
import sys

ansi = re.compile(r'\x1b\[[0-9;]*m')
logcat = re.compile(r'^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+\d+\s+\d+\s+[VDIWEF]\s+[A-Za-z0-9_.:-]+\s*:\s*)(.*)$')
# Safe function/source frames contain no argument values. Keep harmless
# vault-related symbols such as loginVaultCreation without admitting payloads.
stack = re.compile(r"^(?:at\s+[A-Za-z0-9_$.[\]<>:/ -]+\([^()\"'{}=]*\.(?:java|kt|js|tsx?|bundle):\d+(?::\d+)?\)|[A-Za-z0-9_$.[\]<>-]+@(?:[A-Za-z0-9_./-]+\.(?:js|tsx?|bundle)):\d+(?::\d+)?|#\d+\s+pc\s+[0-9a-fA-F]+\s+/[A-Za-z0-9_./-]+(?:\s+\([A-Za-z0-9_.$<>:+ ,\[\]*/-]+\))?)$")
native_frame = re.compile(r'^at\s+[A-Za-z0-9_$.[\]<>-]+\s*\((?:Native Method|Unknown Source|SourceFile:\d+)\)$')
error_class = re.compile(r'\b((?:[A-Za-z_$][A-Za-z0-9_$]*\.)*[A-Za-z_$][A-Za-z0-9_$]*(?:Error|Exception)|Error)(?=\s*:|\s*$)')
markers = [
    ('FATAL EXCEPTION', 'FATAL EXCEPTION'),
    ('fatal signal', 'fatal signal'),
    ('SIGABRT', 'SIGABRT'),
    ('SIGSEGV', 'SIGSEGV'),
    ('Invariant Violation', 'Invariant Violation'),
    ('Wallet home not ready', 'Wallet home not ready'),
    ('Wallet home ready', 'Wallet home ready'),
    ('Startup diagnostic: readiness projection saved', 'Startup diagnostic: readiness projection saved'),
    ('EngineService: Initializing Engine from backup:', 'EngineService: Initializing Engine from backup'),
    ('EngineService: Initializing Engine:', 'EngineService: Initializing Engine'),
    ('Failed to initialize Engine', 'Failed to initialize Engine'),
    ('Setup failed for: android-smoke', 'Appium global setup failed'),
]

def filtered(line):
    line = ansi.sub('', line.rstrip())
    if len(line) > 1800 or re.search(r'(?i)webdriver.*(?:DATA|RESULT)', line):
        return None
    match = logcat.match(line)
    prefix, message = (match.group(1), match.group(2).strip()) if match else ('', line.strip())
    if len(message) <= 600 and (stack.fullmatch(message) or native_frame.fullmatch(message)):
        if re.search(r'https?://|0x[0-9a-fA-F]{40,}', message):
            return None
        return prefix + message
    for needle, safe_marker in markers:
        if needle.lower() in message.lower():
            return prefix + safe_marker
    process = re.search(r'Process:\s*io\.metamask,\s*PID:\s*(\d+)', message)
    if process:
        return prefix + 'Process: io.metamask, PID: ' + process.group(1)
    start = re.search(r'Start proc (\d+):io\.metamask\b', message)
    if start:
        return prefix + 'Start proc ' + start.group(1) + ':io.metamask'
    if re.search(r'(?i)Process io\.metamask\b.*died', message):
        pid = re.search(r'pid\s+(\d+)', message)
        return prefix + 'Process io.metamask died' + (' pid=' + pid.group(1) if pid else '')
    if re.search(r'Cmdline:\s*io\.metamask\b', message):
        return prefix + 'Cmdline: io.metamask'
    if re.search(r'Displayed io\.metamask\b', message):
        return prefix + 'Displayed io.metamask'
    if re.search(r'Force finishing activity.*io\.metamask\b', message):
        return prefix + 'Force finishing activity io.metamask'
    error = error_class.search(message)
    if error:
        cause = 'Caused by: ' if 'Caused by:' in message else ''
        return prefix + cause + error.group(1) + ': <message omitted>'
    if re.search(r'(?i)unhandled.*(?:exception|rejection)', message):
        return prefix + 'Unhandled exception/rejection: <message omitted>'
    return None

if __name__ == '__main__':
    for raw in sys.stdin:
        result = filtered(raw)
        if result is not None:
            print(result, flush=True)
