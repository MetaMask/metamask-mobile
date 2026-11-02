/**
 * Covers the builds.yml secrets wiring: every workflow step that resolves
 * secrets from builds.yml must receive each referenced GitHub secret by name,
 * and set-secrets-from-config.js must map those values into GITHUB_ENV.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts/set-secrets-from-config.js');
const SECRET_CONSUMERS = [
  'set-secrets-from-config.js',
  'validate-secrets-from-config.js',
  'export-profile-secrets.js',
];

interface Step {
  name?: string;
  run?: string;
  env?: Record<string, string>;
}

interface Workflow {
  jobs?: Record<string, { steps?: Step[] }>;
}

interface BuildsConfig {
  builds: Record<string, { secrets?: Record<string, string> }>;
}

function builds(): BuildsConfig['builds'] {
  const config = yaml.load(
    fs.readFileSync(path.join(ROOT, 'builds.yml'), 'utf8'),
  ) as BuildsConfig;
  return config.builds;
}

function referencedSecretNames(): string[] {
  const names = new Set<string>();
  for (const build of Object.values(builds())) {
    Object.values(build.secrets ?? {}).forEach((name) => names.add(name));
  }
  return [...names].sort();
}

function secretConsumingSteps(): { label: string; step: Step }[] {
  const dir = path.join(ROOT, '.github/workflows');
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.yml'))
    .flatMap((file) => {
      const workflow = yaml.load(
        fs.readFileSync(path.join(dir, file), 'utf8'),
      ) as Workflow;
      return Object.entries(workflow.jobs ?? {}).flatMap(([jobId, job]) =>
        (job.steps ?? [])
          .filter((step) =>
            SECRET_CONSUMERS.some((consumer) => step.run?.includes(consumer)),
          )
          .map((step) => ({
            label: `${file} > ${jobId} > ${step.name ?? 'unnamed step'}`,
            step,
          })),
      );
    });
}

function runSetSecrets(env: Record<string, string>) {
  const githubEnv = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'set-secrets-')),
    'github_env',
  );
  fs.writeFileSync(githubEnv, '');
  const result = spawnSync(process.execPath, [SCRIPT], {
    env: { PATH: process.env.PATH ?? '', GITHUB_ENV: githubEnv, ...env },
    encoding: 'utf8',
  });
  return { status: result.status, githubEnv: fs.readFileSync(githubEnv, 'utf8') };
}

describe('builds.yml secrets wiring', () => {
  const steps = secretConsumingSteps();

  it('finds the workflow steps that resolve builds.yml secrets', () => {
    expect(steps.length).toBeGreaterThan(0);
  });

  it.each(steps.map(({ label, step }) => [label, step]))(
    '%s passes every builds.yml secret by name',
    (_label, step) => {
      const env = (step as Step).env ?? {};

      const missing = referencedSecretNames().filter(
        (name) => env[name] !== `\${{ secrets.${name} }}`,
      );

      expect(missing).toStrictEqual([]);
    },
  );
});

describe('set-secrets-from-config.js', () => {
  it('writes each mapped secret to GITHUB_ENV under its env var name', () => {
    const { status, githubEnv } = runSetSecrets({
      CONFIG_SECRETS: JSON.stringify({ PREDEFINED_PASSWORD: 'E2E_PASSWORD' }),
      E2E_PASSWORD: 'value-1',
    });

    expect(status).toBe(0);
    expect(githubEnv).toBe('PREDEFINED_PASSWORD=value-1\n');
  });

  it('fails when no mapped secret is present in the environment', () => {
    const { status, githubEnv } = runSetSecrets({
      CONFIG_SECRETS: JSON.stringify({ PREDEFINED_PASSWORD: 'E2E_PASSWORD' }),
    });

    expect(status).toBe(1);
    expect(githubEnv).toBe('');
  });
});
