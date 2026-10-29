import { homedir } from 'node:os';
import { join } from 'node:path';
import { getDerivedDataPath } from './wda-derived-data-path.mjs';

function setEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

describe('getDerivedDataPath', () => {
  const originalDerivedDataPath = process.env['WDA_DERIVED_DATA_PATH'];
  const originalWorkspace = process.env['GITHUB_WORKSPACE'];

  afterEach(() => {
    setEnv('WDA_DERIVED_DATA_PATH', originalDerivedDataPath);
    setEnv('GITHUB_WORKSPACE', originalWorkspace);
  });

  it('honors an explicit WDA_DERIVED_DATA_PATH', () => {
    setEnv('WDA_DERIVED_DATA_PATH', '/opt/wda-derived-data');
    setEnv('GITHUB_WORKSPACE', '/workspace/metamask-mobile');

    expect(getDerivedDataPath()).toBe('/opt/wda-derived-data');
  });

  it('keeps CI derived data inside the workspace so cache restore does not walk above it', () => {
    setEnv('WDA_DERIVED_DATA_PATH', undefined);
    setEnv(
      'GITHUB_WORKSPACE',
      '/Users/runner/work/metamask-mobile/metamask-mobile',
    );

    expect(getDerivedDataPath()).toBe(
      '/Users/runner/work/metamask-mobile/metamask-mobile/.cache/appium-wda',
    );
  });

  it('uses the home directory for local runs', () => {
    setEnv('WDA_DERIVED_DATA_PATH', undefined);
    setEnv('GITHUB_WORKSPACE', undefined);

    expect(getDerivedDataPath()).toBe(join(homedir(), 'appium-wda'));
  });
});
