#!/usr/bin/env node
/**
 * Resolves the latest BrowserStack app URLs for performance E2E when a PR only
 * changes tests and should reuse main-branch builds instead of compiling fresh.
 */

const {
  MAIN_WITH_SRP_CUSTOM_ID_PREFIX,
  MAIN_WITHOUT_SRP_CUSTOM_ID_PREFIX,
  assertBrowserStackAppUrl,
  assertBrowserStackCustomId,
  writeGithubOutputs,
} = require('./browserstack-app-validation.cjs');

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

async function main() {
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

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    console.error('BrowserStack recent_apps response was not an array');
    process.exit(1);
  }

  /** @type {Array<{ custom_id?: string; app_url?: string; uploaded_at?: string }>} */
  const apps = payload;

  function findLatestApp(prefix, kind) {
    const matches = apps
      .filter(
        (app) =>
          typeof app.custom_id === 'string' && app.custom_id.startsWith(prefix),
      )
      .filter(
        (app) => typeof app.app_url === 'string' && app.app_url.length > 0,
      )
      .sort((left, right) => {
        const leftTime = Date.parse(left.uploaded_at || '') || 0;
        const rightTime = Date.parse(right.uploaded_at || '') || 0;
        return rightTime - leftTime;
      });

    const candidate = matches[0];
    if (!candidate) {
      return null;
    }

    try {
      return {
        customId: assertBrowserStackCustomId(candidate.custom_id, kind),
        appUrl: assertBrowserStackAppUrl(
          candidate.app_url,
          `${kind} app_url`,
        ),
      };
    } catch (error) {
      console.error(
        `Rejected BrowserStack ${kind} candidate ${candidate.custom_id || 'unknown'}: ${error.message}`,
      );
      return null;
    }
  }

  const withSrp = findLatestApp(MAIN_WITH_SRP_CUSTOM_ID_PREFIX, 'with-srp');
  const withoutSrp = findLatestApp(
    MAIN_WITHOUT_SRP_CUSTOM_ID_PREFIX,
    'without-srp',
  );

  if (!withSrp || !withoutSrp) {
    console.error(
      'Could not resolve latest BrowserStack Android apps for main-build reuse.',
    );
    console.error(
      `Found with-SRP=${withSrp?.customId || 'none'}, without-SRP=${withoutSrp?.customId || 'none'}`,
    );
    process.exit(1);
  }

  console.log(`Reusing BrowserStack with-SRP app: ${withSrp.customId}`);
  console.log(`Reusing BrowserStack without-SRP app: ${withoutSrp.customId}`);

  writeGithubOutputs(githubOutputPath, {
    found: 'true',
    'with-srp-browserstack-url': withSrp.appUrl,
    'without-srp-browserstack-url': withoutSrp.appUrl,
    'with-srp-version': 'main-reuse',
    'without-srp-version': 'main-reuse',
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
