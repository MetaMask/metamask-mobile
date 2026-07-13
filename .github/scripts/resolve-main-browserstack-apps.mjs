#!/usr/bin/env node
/**
 * Resolves the latest BrowserStack app URLs for performance E2E when a PR only
 * changes tests and should reuse main-branch builds instead of compiling fresh.
 */

import fs from 'node:fs';

const githubOutputPath = process.env.GITHUB_OUTPUT;
if (!githubOutputPath) {
  console.error('GITHUB_OUTPUT is not set');
  process.exit(1);
}

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

if (!username || !accessKey) {
  console.error('BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY are required');
  process.exit(1);
}

const auth = Buffer.from(`${username}:${accessKey}`).toString('base64');
const response = await fetch(
  'https://api-cloud.browserstack.com/app-automate/recent_apps',
  {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  },
);

if (!response.ok) {
  console.error(
    `BrowserStack recent_apps request failed: ${response.status} ${response.statusText}`,
  );
  process.exit(1);
}

/** @type {Array<{ custom_id?: string; app_url?: string; uploaded_at?: string }>} */
const apps = await response.json();

function findLatestApp(prefix) {
  const matches = apps
    .filter((app) => typeof app.custom_id === 'string' && app.custom_id.startsWith(prefix))
    .filter((app) => typeof app.app_url === 'string' && app.app_url.length > 0)
    .sort((left, right) => {
      const leftTime = Date.parse(left.uploaded_at || '') || 0;
      const rightTime = Date.parse(right.uploaded_at || '') || 0;
      return rightTime - leftTime;
    });

  return matches[0] || null;
}

const withSrp = findLatestApp('MetaMask-Android-With-SRP-');
const withoutSrp = findLatestApp('MetaMask-Android-Without-SRP-');

if (!withSrp?.app_url || !withoutSrp?.app_url) {
  console.error(
    'Could not resolve latest BrowserStack Android apps for main-build reuse.',
  );
  console.error(
    `Found with-SRP=${withSrp?.custom_id || 'none'}, without-SRP=${withoutSrp?.custom_id || 'none'}`,
  );
  process.exit(1);
}

console.log(`Reusing BrowserStack with-SRP app: ${withSrp.custom_id}`);
console.log(`Reusing BrowserStack without-SRP app: ${withoutSrp.custom_id}`);

const outputLines = [
  'found=true',
  `with-srp-browserstack-url=${withSrp.app_url}`,
  `without-srp-browserstack-url=${withoutSrp.app_url}`,
  'with-srp-version=main-reuse',
  'without-srp-version=main-reuse',
];

fs.appendFileSync(githubOutputPath, `${outputLines.join('\n')}\n`);
