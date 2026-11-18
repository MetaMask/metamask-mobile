/* eslint-disable import-x/no-nodejs-modules */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ApiEnv } from '../app/core/apiEnv';
import {
  resolvePredictApiUrl,
  resolvePredictDeviceAuthIssuerUrl,
} from '../app/components/UI/PredictNext/config/predictClusterUrls';

/**
 * A Predict bearer token is issued by the A2T issuer for one cluster and
 * rejected by another cluster's API. Both hosts therefore have to come from
 * the same cluster, and `MM_API_ENV` is the only thing that selects it.
 *
 * Pinning `MM_PREDICT_API_URL` or `MM_PREDICT_A2T_URL` in `builds.yml` splits
 * them: the pinned host is baked from one place while the issuer follows
 * `MM_API_ENV` from another. `_api_prod` used to pin the dev predict-api host
 * and every cluster inherited it, so `main-exp` (uat) issued at
 * `authentication.uat-api` and then called `predict-api.dev-api`.
 */
const BUILDS_PATH = path.resolve(__dirname, '../builds.yml');
const CLUSTER_OWNED_KEYS = ['MM_PREDICT_API_URL', 'MM_PREDICT_A2T_URL'];
const CLUSTER_BY_API_ENV_VALUE: Record<string, ApiEnv> = {
  [ApiEnv.Dev]: ApiEnv.Dev,
  [ApiEnv.Uat]: ApiEnv.Uat,
};

interface BuildConfig {
  env?: Record<string, unknown>;
}

const builds = (): [string, BuildConfig][] => {
  const config = yaml.load(fs.readFileSync(BUILDS_PATH, 'utf8')) as {
    builds: Record<string, BuildConfig>;
  };
  return Object.entries(config.builds);
};

describe('builds.yml leaves both Predict hosts to MM_API_ENV', () => {
  it.each(CLUSTER_OWNED_KEYS)('pins %s in no build', (key) => {
    const offenders = builds()
      .filter(([, build]) => build.env?.[key] !== undefined)
      .map(([name]) => name);

    expect(offenders).toEqual([]);
  });

  it('keeps each build on the cluster MM_API_ENV selects', () => {
    const divergences = builds().flatMap(([name, build]) => {
      const rawApiEnv = String(build.env?.MM_API_ENV);
      // `MM_API_ENV` reads like the app reads it: unknown is prod.
      const apiEnv = CLUSTER_BY_API_ENV_VALUE[rawApiEnv] ?? ApiEnv.Prod;
      // A CI build is never a local development build.
      const reading = { rawApiEnv, apiEnv, isDevelopment: false };
      const clusterApiUrl = resolvePredictApiUrl(reading, undefined);
      const clusterIssuerUrl = resolvePredictDeviceAuthIssuerUrl(
        reading,
        undefined,
      );
      // What the bundle actually bakes, pin included.
      const shippedApiUrl = resolvePredictApiUrl(
        reading,
        build.env?.MM_PREDICT_API_URL as string | undefined,
      );
      const shippedIssuerUrl = resolvePredictDeviceAuthIssuerUrl(
        reading,
        build.env?.MM_PREDICT_A2T_URL as string | undefined,
      );

      const same =
        shippedApiUrl === clusterApiUrl &&
        shippedIssuerUrl === clusterIssuerUrl;
      return same
        ? []
        : [
            `${name}: ${rawApiEnv} wants ${String(clusterApiUrl)} / ${String(
              clusterIssuerUrl,
            )}, bakes ${String(shippedApiUrl)} / ${String(shippedIssuerUrl)}`,
          ];
    });

    expect(divergences).toEqual([]);
  });
});
