import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { findUnmappedSecrets } from './validate-build-config';

const repoRoot = path.join(__dirname, '..');

const config = {
  builds: {
    'main-prod': { secrets: { MM_SENTRY_DSN: 'MM_SENTRY_DSN' } },
    'main-dev': { secrets: { INFURA_ID: 'MM_INFURA_PROJECT_ID' } },
  },
};

const workflowWithEnv = (env: Record<string, string>): object => ({
  jobs: {
    build: {
      steps: [
        {
          name: 'Set secrets',
          env: { CONFIG_SECRETS: '{}', ...env },
          run: 'node scripts/set-secrets-from-config.js',
        },
      ],
    },
  },
});

describe('findUnmappedSecrets', () => {
  it('returns no errors when the step maps every builds.yml secret', () => {
    const workflows = {
      'build.yml': workflowWithEnv({
        MM_SENTRY_DSN: '${{ secrets.MM_SENTRY_DSN }}',
        MM_INFURA_PROJECT_ID: '${{ secrets.MM_INFURA_PROJECT_ID }}',
      }),
    };

    const errors = findUnmappedSecrets(config, workflows);

    expect(errors).toEqual([]);
  });

  it('reports a builds.yml secret the step does not map', () => {
    const workflows = {
      'build.yml': workflowWithEnv({
        MM_SENTRY_DSN: '${{ secrets.MM_SENTRY_DSN }}',
      }),
    };

    const errors = findUnmappedSecrets(config, workflows);

    expect(errors).toEqual([
      'build.yml (build / "Set secrets"): missing env MM_INFURA_PROJECT_ID: ${{ secrets.MM_INFURA_PROJECT_ID }}',
    ]);
  });

  it('reports a secret mapped from a different secret name', () => {
    const workflows = {
      'build.yml': workflowWithEnv({
        MM_SENTRY_DSN: '${{ secrets.MM_SENTRY_DSN }}',
        MM_INFURA_PROJECT_ID: '${{ secrets.OTHER }}',
      }),
    };

    const errors = findUnmappedSecrets(config, workflows);

    expect(errors).toHaveLength(1);
  });

  it('skips steps that still pass ALL_SECRETS', () => {
    const workflows = {
      'build.yml': workflowWithEnv({
        ALL_SECRETS: '${{ toJSON(secrets) }}',
      }),
    };

    const errors = findUnmappedSecrets(config, workflows);

    expect(errors).toEqual([]);
  });

  it('finds no unmapped secrets in the repository workflows', () => {
    const buildsConfig = yaml.load(
      fs.readFileSync(path.join(repoRoot, 'builds.yml'), 'utf8'),
    ) as object;
    const workflowsDir = path.join(repoRoot, '.github/workflows');
    const workflows = Object.fromEntries(
      fs
        .readdirSync(workflowsDir)
        .filter((file) => /\.ya?ml$/.test(file))
        .map((file) => [
          file,
          yaml.load(fs.readFileSync(path.join(workflowsDir, file), 'utf8')),
        ]),
    );

    const errors = findUnmappedSecrets(buildsConfig, workflows);

    expect(errors).toEqual([]);
  });
});
