/* eslint-disable import-x/no-nodejs-modules, no-undef -- This postinstall entrypoint runs in Node via tsx outside the React Native runtime. */
import path from 'node:path';

import skillsPostinstall from './skills-postinstall-lib.ts';

if (process.argv[1]?.endsWith(`${path.sep}skills-postinstall.mts`)) {
  process.exit(skillsPostinstall.postinstall());
}
