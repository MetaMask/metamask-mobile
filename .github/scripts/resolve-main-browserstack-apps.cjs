#!/usr/bin/env node
/**
 * Resolves the latest BrowserStack app URLs for performance E2E when a PR only
 * changes tests and should reuse main-branch builds instead of compiling fresh.
 *
 * Prefer BrowserStack's recent_apps/{custom_id} endpoint with the stable main
 * custom_id. Fall back to scanning recent_apps for stable or legacy main IDs.
 * When nothing is found, exits 0 with found=false so CI can fall back to a fresh
 * dual Android upload.
 */

const {
  MAIN_WITH_SRP_CUSTOM_ID,
  MAIN_WITHOUT_SRP_CUSTOM_ID,
  assertBrowserStackAppUrl,
  assertBrowserStackCustomId,
  isMainBranchBrowserStackCustomId,
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

/**
 * @param {string} auth
 * @param {string} path
 * @returns {Promise<{ ok: boolean; status: number; payload: unknown }>}
 */
async function browserStackGet(auth, path) {
  const response = await fetch(
    `https://api-cloud.browserstack.com/app-automate/${path}`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    },
  );
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { ok: response.ok, status: response.status, payload };
}

/**
 * @param {unknown} payload
 * @returns {Array<{ custom_id?: string; app_url?: string; uploaded_at?: string }>}
 */
function asAppList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    const maybeApps = /** @type {{ apps?: unknown }} */ (payload).apps;
    if (Array.isArray(maybeApps)) {
      return maybeApps;
    }
  }
  return [];
}

/**
 * @param {Array<{ custom_id?: string; app_url?: string; uploaded_at?: string }>} apps
 * @param {'with-srp' | 'without-srp'} kind
 * @returns {{ customId: string; appUrl: string } | null}
 */
function pickLatestValidApp(apps, kind) {
  const matches = apps
    .filter((app) => isMainBranchBrowserStackCustomId(app.custom_id, kind))
    .filter((app) => typeof app.app_url === 'string' && app.app_url.length > 0)
    .sort((left, right) => {
      const leftTime = Date.parse(left.uploaded_at || '') || 0;
      const rightTime = Date.parse(right.uploaded_at || '') || 0;
      return rightTime - leftTime;
    });

  for (const candidate of matches) {
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
    }
  }

  return null;
}

/**
 * @param {string} auth
 * @param {string} customId
 * @param {'with-srp' | 'without-srp'} kind
 * @returns {Promise<{ customId: string; appUrl: string } | null>}
 */
async function resolveByCustomId(auth, customId, kind) {
  const encodedId = encodeURIComponent(customId);
  const { ok, status, payload } = await browserStackGet(
    auth,
    `recent_apps/${encodedId}`,
  );

  if (!ok) {
    console.warn(
      `BrowserStack recent_apps/${customId} returned ${status}; will try recent_apps list fallback.`,
    );
    return null;
  }

  const picked = pickLatestValidApp(asAppList(payload), kind);
  if (picked) {
    console.log(`Resolved ${kind} via recent_apps/${customId}: ${picked.customId}`);
  }
  return picked;
}

/**
 * @param {string} auth
 * @param {'with-srp' | 'without-srp'} kind
 * @returns {Promise<{ customId: string; appUrl: string } | null>}
 */
async function resolveFromRecentAppsList(auth, kind) {
  const { ok, status, payload } = await browserStackGet(auth, 'recent_apps');
  if (!ok) {
    console.warn(
      `BrowserStack recent_apps list returned ${status}; cannot fall back for ${kind}.`,
    );
    return null;
  }

  const apps = asAppList(payload);
  if (!Array.isArray(payload) && apps.length === 0) {
    console.warn('BrowserStack recent_apps response was not a usable app list');
    return null;
  }

  const picked = pickLatestValidApp(apps, kind);
  if (picked) {
    console.log(
      `Resolved ${kind} via recent_apps list scan: ${picked.customId}`,
    );
  }
  return picked;
}

async function main() {
  const auth = Buffer.from(`${username}:${accessKey}`).toString('base64');

  let withSrp = await resolveByCustomId(
    auth,
    MAIN_WITH_SRP_CUSTOM_ID,
    'with-srp',
  );
  if (!withSrp) {
    withSrp = await resolveFromRecentAppsList(auth, 'with-srp');
  }

  let withoutSrp = await resolveByCustomId(
    auth,
    MAIN_WITHOUT_SRP_CUSTOM_ID,
    'without-srp',
  );
  if (!withoutSrp) {
    withoutSrp = await resolveFromRecentAppsList(auth, 'without-srp');
  }

  if (!withSrp || !withoutSrp) {
    console.warn(
      'Could not resolve latest BrowserStack Android apps for main-build reuse.',
    );
    console.warn(
      `Found with-SRP=${withSrp?.customId || 'none'}, without-SRP=${withoutSrp?.customId || 'none'}`,
    );
    console.warn(
      'Emitting found=false so CI can fall back to a fresh Android dual upload.',
    );
    writeGithubOutputs(githubOutputPath, {
      found: 'false',
    });
    return;
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
