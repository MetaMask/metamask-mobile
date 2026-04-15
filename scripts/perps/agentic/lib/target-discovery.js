'use strict';

const http = require('node:http');
const { loadSimulatorName, loadAndroidDevice } = require('./config');
const { createWSClient } = require('./ws-client');

/** Fetch JSON from a URL (http only, no external deps) */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

/**
 * Quick probe: connect to a CDP target, evaluate `__DEV__`, disconnect.
 * Returns true if __AGENTIC__ is installed, false otherwise.
 */
async function probeTarget(wsUrl) {
  try {
    const client = await createWSClient(wsUrl, 3000);
    try {
      const result = await client.send('Runtime.evaluate', {
        expression: '(function(){ return typeof globalThis.__AGENTIC__; })()',
        returnByValue: true,
        awaitPromise: false,
      });
      return result?.result?.value === 'object';
    } finally {
      client.close();
    }
  } catch {
    // Connection failed — target is not the right one
    return false;
  }
}

/**
 * Discover the Hermes CDP WebSocket URL from Metro's /json/list endpoint.
 *
 * Multi-simulator support:
 *   - When IOS_SIMULATOR is set, filters targets by deviceName
 *   - With Hermes bridgeless mode, there are multiple pages per device:
 *     page 1 = native C++ runtime, page 2+ = JS runtime (where __AGENTIC__ lives)
 *   - We probe candidates to find the one with __AGENTIC__ installed
 */
async function discoverTarget(port) {
  const listUrl = `http://localhost:${port}/json/list`;
  let targets;
  try {
    targets = await fetchJSON(listUrl);
  } catch (e) {
    throw new Error(
      `Cannot reach Metro at ${listUrl}. Is Metro running?\n  ${e.message}`,
    );
  }

  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error(`No debug targets found at ${listUrl}`);
  }

  // Filter to React Native / Hermes targets with a WebSocket URL
  let candidates = targets.filter(
    (t) =>
      t.webSocketDebuggerUrl &&
      t.title &&
      (/react/i.test(t.title) || /hermes/i.test(t.title)),
  );

  // Filter by device name if IOS_SIMULATOR is set
  const simName = loadSimulatorName();
  if (simName && candidates.length > 1) {
    const deviceFiltered = candidates.filter(
      (t) => t.deviceName === simName,
    );
    if (deviceFiltered.length > 0) {
      candidates = deviceFiltered;
    }
  }

  // Filter by device name if ANDROID_DEVICE is set
  const androidDevice = loadAndroidDevice();
  if (androidDevice && candidates.length > 1) {
    const deviceFiltered = candidates.filter(
      (t) => t.deviceName === androidDevice,
    );
    if (deviceFiltered.length > 0) {
      candidates = deviceFiltered;
    }
  }

  if (candidates.length === 0) {
    candidates = targets.filter((t) => t.webSocketDebuggerUrl);
  }

  if (candidates.length === 0) {
    throw new Error(
      `No suitable debug target found. Targets:\n${JSON.stringify(targets, null, 2)}`,
    );
  }

  // Sort by page number descending (JS runtime has higher page number than C++ native)
  candidates.sort((a, b) => {
    const aPage = Number.parseInt((a.id || '').split('-').pop() || '0', 10);
    const bPage = Number.parseInt((b.id || '').split('-').pop() || '0', 10);
    return bPage - aPage;
  });

  // Probe candidates to find the one with __AGENTIC__ installed (the JS runtime)
  for (const candidate of candidates) {
    const hasAgentic = await probeTarget(candidate.webSocketDebuggerUrl);
    if (hasAgentic) {
      return { wsUrl: candidate.webSocketDebuggerUrl, deviceName: candidate.deviceName || '' };
    }
  }

  // Fallback: return highest page number (most likely the JS runtime)
  return { wsUrl: candidates[0].webSocketDebuggerUrl, deviceName: candidates[0].deviceName || '' };
}

/**
 * Discover ALL Hermes targets with __AGENTIC__ installed (one per platform/device).
 * Groups by deviceName so each device returns at most one target.
 */
async function discoverAllTargets(port) {
  const listUrl = `http://localhost:${port}/json/list`;
  let targets;
  try {
    targets = await fetchJSON(listUrl);
  } catch (e) {
    throw new Error(
      `Cannot reach Metro at ${listUrl}. Is Metro running?\n  ${e.message}`,
    );
  }

  const candidates = (targets || []).filter(
    (t) =>
      t.webSocketDebuggerUrl &&
      t.title &&
      (/react/i.test(t.title) || /hermes/i.test(t.title)),
  );

  // Sort by page number descending (JS runtime has higher page number)
  candidates.sort((a, b) => {
    const aPage = Number.parseInt((a.id || '').split('-').pop() || '0', 10);
    const bPage = Number.parseInt((b.id || '').split('-').pop() || '0', 10);
    return bPage - aPage;
  });

  // Group by deviceName, probe each to find the JS runtime target
  const seen = new Set();
  const results = [];
  for (const candidate of candidates) {
    const device = candidate.deviceName || candidate.id || candidate.webSocketDebuggerUrl;
    if (seen.has(device)) continue;
    const hasAgentic = await probeTarget(candidate.webSocketDebuggerUrl);
    if (hasAgentic) {
      seen.add(device);
      results.push({ wsUrl: candidate.webSocketDebuggerUrl, deviceName: device });
    }
  }
  return results;
}

module.exports = { discoverTarget, discoverAllTargets };
