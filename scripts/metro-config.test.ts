/* eslint-disable import-x/no-nodejs-modules */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');

// Metro loads metro.config.js with plain Node, so resolve in a child process:
// under Jest, babel inlines `process.env.*` at transform time and the flag
// could not be varied per test.
const resolveSignerScript = `
  const path = require('node:path');
  Promise.resolve(require(path.resolve('metro.config.js'))({}))
    .then((config) => {
      const resolution = config.resolver.resolveRequest(
        {
          originModulePath: path.resolve('app/components/Views/Root/index.tsx'),
          resolveRequest: () => ({ type: 'sourceFile', filePath: 'upstream' }),
        },
        '../../UI/Perps/Lighter/LighterSignerWebView',
        'ios',
      );
      process.stdout.write('RESOLUTION=' + JSON.stringify(resolution) + '\\n');
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
`;

const resolveSigner = (lighterFlag: string | undefined): unknown => {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;
  if (lighterFlag !== undefined) {
    env.MM_PERPS_LIGHTER_PROVIDER_ENABLED = lighterFlag;
  }

  const result = spawnSync(process.execPath, ['-e', resolveSignerScript], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
  });

  expect(result.status).toBe(0);
  const line = result.stdout
    .split('\n')
    .find((outputLine) => outputLine.startsWith('RESOLUTION='));
  return JSON.parse((line ?? 'RESOLUTION=null').slice('RESOLUTION='.length));
};

describe('metro.config.js Lighter signer resolution', () => {
  // Dev builds skip Metro's constant folding, so the gated require() in
  // Root/index.tsx still reaches the resolver and would bundle the ~10 MB
  // embedded signer unless it resolves to an empty module.
  it.each([undefined, 'false', ''])(
    'resolves the signer to an empty module when MM_PERPS_LIGHTER_PROVIDER_ENABLED=%p',
    (flag) => {
      const resolution = resolveSigner(flag);

      expect(resolution).toEqual({ type: 'empty' });
    },
  );

  it('resolves the real signer when MM_PERPS_LIGHTER_PROVIDER_ENABLED=true', () => {
    const resolution = resolveSigner('true');

    expect(resolution).toEqual({ type: 'sourceFile', filePath: 'upstream' });
  });
});
