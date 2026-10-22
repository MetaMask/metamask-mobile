import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';

const WORKFLOW_PATH = path.join(
  __dirname,
  '../../../workflows/run-performance-e2e.yml',
);

type WorkflowStep = { id?: string; run?: string };
type Workflow = { jobs: Record<string, { steps?: WorkflowStep[] }> };

const loadCredentialScript = (): string => {
  const workflow = yaml.load(
    fs.readFileSync(WORKFLOW_PATH, 'utf8'),
  ) as Workflow;
  const step = workflow.jobs['check-testmu-credentials'].steps?.find(
    ({ id }) => id === 'resolve',
  );
  if (!step?.run) {
    throw new Error('check-testmu-credentials resolve step has no script');
  }
  return step.run;
};

interface RunOptions {
  credentials: boolean;
  httpCode?: string;
}

const runCredentialScript = ({ credentials, httpCode = '200' }: RunOptions) => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testmu-creds-'));
  const binDir = path.join(workDir, 'bin');
  const outputFile = path.join(workDir, 'github-output');
  fs.mkdirSync(binDir);
  fs.writeFileSync(outputFile, '');
  fs.writeFileSync(
    path.join(binDir, 'curl'),
    `#!/bin/bash\nprintf '%s' '${httpCode}'\n`,
    { mode: 0o755 },
  );

  const result = spawnSync('bash', ['-e', '-c', loadCredentialScript()], {
    encoding: 'utf8',
    env: {
      PATH: `${binDir}:${process.env.PATH}`,
      GITHUB_OUTPUT: outputFile,
      LT_USERNAME: credentials ? 'user' : '',
      LT_ACCESS_KEY: credentials ? 'key' : '',
    },
  });

  return {
    status: result.status,
    output: fs.readFileSync(outputFile, 'utf8'),
  };
};

describe('run-performance-e2e check-testmu-credentials', () => {
  it('fails when the credentials are missing', () => {
    const result = runCredentialScript({
      credentials: false,
    });

    expect(result.status).toBe(1);
    expect(result.output).not.toContain('testmu_ready');
  });

  it('fails when the API rejects the credentials', () => {
    const result = runCredentialScript({
      credentials: true,
      httpCode: '401',
    });

    expect(result.status).toBe(1);
    expect(result.output).not.toContain('testmu_ready');
  });

  it('marks TestMu ready when the API accepts the credentials', () => {
    const result = runCredentialScript({
      credentials: true,
    });

    expect(result.status).toBe(0);
    expect(result.output).toContain('testmu_ready=true');
  });
});
