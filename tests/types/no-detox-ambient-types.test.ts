/**
 * @jest-environment node
 */

/* eslint-disable import-x/no-nodejs-modules */
import { existsSync } from 'fs';
import path from 'path';

describe('Appium Element API', () => {
  it('does not keep ambient Detox types', () => {
    const detoxAmbientTypes = path.join(__dirname, 'detox.d.ts');

    expect(existsSync(detoxAmbientTypes)).toBe(false);
  });
});
