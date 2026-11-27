/* eslint-disable import-x/no-nodejs-modules */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

/**
 * Core sends the profile bearer token to the notify-perps host, and that token
 * belongs to the cluster `MM_API_ENV` selects. Every build therefore has to
 * bake the notify-perps host of its own cluster. An unset `MM_API_ENV` is prod.
 */
const BUILDS_PATH = path.resolve(__dirname, '../builds.yml');
const NOTIFY_PERPS_URL_BY_API_ENV: Record<string, string> = {
  prod: 'https://perps.api.cx.metamask.io',
  dev: 'https://perps.dev-api.cx.metamask.io',
  uat: 'https://perps.uat-api.cx.metamask.io',
};

interface BuildConfig {
  env?: Record<string, string | undefined>;
}

const builds = (): [string, BuildConfig][] => {
  const config = yaml.load(fs.readFileSync(BUILDS_PATH, 'utf8')) as {
    builds: Record<string, BuildConfig>;
  };
  return Object.entries(config.builds);
};

describe('builds.yml notify-perps host', () => {
  it('bakes the host of the cluster MM_API_ENV selects in every build', () => {
    const divergences = builds().flatMap(([name, build]) => {
      const rawApiEnv = build.env?.MM_API_ENV ?? 'prod';
      const apiEnv = rawApiEnv in NOTIFY_PERPS_URL_BY_API_ENV ? rawApiEnv : 'prod';
      const expected = NOTIFY_PERPS_URL_BY_API_ENV[apiEnv];
      const actual = build.env?.NOTIFY_PERPS_API_URL;
      return actual === expected
        ? []
        : [`${name}: ${rawApiEnv} wants ${expected}, bakes ${actual}`];
    });

    expect(divergences).toEqual([]);
  });
});
