/* eslint-disable import-x/no-nodejs-modules */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  findStepSecrets,
  validateStepSecrets,
} from './validate-step-secrets';

const WORKFLOWS_DIR = path.resolve(__dirname, '../.github/workflows');
const OPTIONAL_SECRETS_PATH = path.resolve(
  __dirname,
  '../.github/optional-secrets.yml',
);
const CALL = /node scripts\/validate-step-secrets\.js (\S+) (\S+)/g;

interface Step {
  id?: string;
  env?: Record<string, unknown>;
}

interface Workflow {
  jobs?: Record<string, { steps?: Step[] }>;
}

const workflow = (steps: Step[]): Workflow => ({ jobs: { build: { steps } } });

describe('findStepSecrets', () => {
  it('returns the plain secret mappings of the step', () => {
    const result = findStepSecrets(
      workflow([
        {
          id: 'build-app',
          env: {
            MM_SENTRY_DSN: '${{ secrets.MM_SENTRY_DSN }}',
            BYOA_AUTH_SECRET: '${{secrets.E2E_BYOA_AUTH_SECRET}}',
            CI: 'true',
            PLATFORM: '${{ inputs.platform }}',
          },
        },
      ]),
      'build-app',
    );

    expect(result).toEqual({
      MM_SENTRY_DSN: 'MM_SENTRY_DSN',
      BYOA_AUTH_SECRET: 'E2E_BYOA_AUTH_SECRET',
    });
  });

  it('skips conditional mappings, which are empty on purpose for some builds', () => {
    const result = findStepSecrets(
      workflow([
        {
          id: 'build-app',
          env: {
            ADDITIONAL_SRP_1:
              "${{ endsWith(inputs.build_name, '-with-srp') && secrets.IN_BUILD_SRP || '' }}",
          },
        },
      ]),
      'build-app',
    );

    expect(result).toEqual({});
  });

  it('throws when no step has the id', () => {
    expect(() => findStepSecrets(workflow([{ id: 'other' }]), 'build-app')).toThrow(
      'No step with id "build-app" in the workflow.',
    );
  });
});

describe('validateStepSecrets', () => {
  const mapping = {
    MM_SENTRY_DSN: 'MM_SENTRY_DSN',
    MM_BRAZE_SDK_ENDPOINT: 'MM_BRAZE_SDK_ENDPOINT',
  };
  const optionalSecrets = { 'build-flask-prod': ['MM_BRAZE_SDK_ENDPOINT'] };

  it('passes when every mapped secret is set and well-formed', () => {
    const result = validateStepSecrets({
      mapping,
      environment: 'build-production',
      optionalSecrets,
      env: { MM_SENTRY_DSN: 'dsn', MM_BRAZE_SDK_ENDPOINT: 'endpoint' },
    });

    expect(result).toEqual({ errors: [], skipped: [], unmapped: [] });
  });

  it('fails on a secret that is not set in the environment', () => {
    const result = validateStepSecrets({
      mapping,
      environment: 'build-production',
      optionalSecrets,
      env: { MM_SENTRY_DSN: 'dsn', MM_BRAZE_SDK_ENDPOINT: '' },
    });

    expect(result.errors).toEqual([
      'MM_BRAZE_SDK_ENDPOINT: not set in the build-production GitHub environment (mapped to MM_BRAZE_SDK_ENDPOINT)',
    ]);
  });

  it('skips a secret that is not set when it is optional for the environment', () => {
    const result = validateStepSecrets({
      mapping,
      environment: 'build-flask-prod',
      optionalSecrets,
      env: { MM_SENTRY_DSN: 'dsn', MM_BRAZE_SDK_ENDPOINT: '' },
    });

    expect(result).toEqual({
      errors: [],
      skipped: ['MM_BRAZE_SDK_ENDPOINT'],
      unmapped: [],
    });
  });

  it('checks an optional secret that is set', () => {
    const result = validateStepSecrets({
      mapping,
      environment: 'build-flask-prod',
      optionalSecrets,
      env: { MM_SENTRY_DSN: 'dsn', MM_BRAZE_SDK_ENDPOINT: 'endpoint\n' },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(
      /^MM_BRAZE_SDK_ENDPOINT: value has trailing whitespace/,
    );
  });

  it('reports malformed values without printing them', () => {
    const result = validateStepSecrets({
      mapping: { MM_SENTRY_DSN: 'MM_SENTRY_DSN' },
      environment: 'build-production',
      optionalSecrets,
      env: { MM_SENTRY_DSN: 'super-secret-value\r' },
    });

    expect(result.errors).not.toHaveLength(0);
    expect(result.errors.join('\n')).not.toContain('super-secret-value');
  });

  it('skips a secret the running step does not map', () => {
    const result = validateStepSecrets({
      mapping,
      environment: 'build-production',
      optionalSecrets,
      env: { MM_SENTRY_DSN: 'dsn' },
    });

    expect(result).toEqual({
      errors: [],
      skipped: [],
      unmapped: ['MM_BRAZE_SDK_ENDPOINT'],
    });
  });
});

describe('workflows that call validate-step-secrets.js', () => {
  const calls = fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((file) => file.endsWith('.yml'))
    .flatMap((file) =>
      [
        ...fs
          .readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8')
          .matchAll(CALL),
      ].map(([, workflowPath, stepId]) => ({ file, workflowPath, stepId })),
    );
  const loadWorkflow = (file: string) =>
    yaml.load(fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8')) as Workflow;

  it('covers every step that bundles the app', () => {
    expect(calls.map(({ file }) => file).sort()).toEqual([
      'build-android-upload-to-testmu.yml',
      'build-rc-repack.yml',
      'build.yml',
      'eas-update-platform.yml',
    ]);
  });

  it.each(calls)(
    '$file passes its own file and an id of a step that maps secrets',
    ({ file, workflowPath, stepId }) => {
      expect(workflowPath).toBe(`.github/workflows/${file}`);

      const mapping = findStepSecrets(loadWorkflow(file), stepId);

      expect(Object.keys(mapping).length).toBeGreaterThan(0);
    },
  );

  it.each(calls)(
    '$file sets SECRETS_ENVIRONMENT on the checked step',
    ({ file, stepId }) => {
      const steps = Object.values(loadWorkflow(file).jobs ?? {}).flatMap(
        (job) => job.steps ?? [],
      );
      const step = steps.find((candidate) => candidate.id === stepId);

      expect(step?.env?.SECRETS_ENVIRONMENT).toEqual(expect.any(String));
    },
  );

  it('maps every optional secret in a checked step', () => {
    const checkedSecrets = new Set(
      calls.flatMap(({ file, stepId }) =>
        Object.values(findStepSecrets(loadWorkflow(file), stepId)),
      ),
    );
    const optionalSecrets = yaml.load(
      fs.readFileSync(OPTIONAL_SECRETS_PATH, 'utf8'),
    ) as Record<string, string[]>;

    const unused = Object.values(optionalSecrets)
      .flat()
      .filter((secret) => !checkedSecrets.has(secret));

    expect(unused).toEqual([]);
  });
});
