/**
 * Tests for AccountTreeController integration in Authentication service
 * This test verifies that the Authentication methods properly call
 * AccountTreeController.init() and AccountsController.updateAccounts()
 */

// eslint-disable-next-line import/no-nodejs-modules
import fs from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import path from 'path';

describe('Authentication AccountTreeController Integration', () => {
  const authenticationFilePath = path.join(__dirname, 'Authentication.ts');
  let authenticationSource: string;

  beforeAll(() => {
    authenticationSource = fs.readFileSync(authenticationFilePath, 'utf8');
  });

  describe('userEntryAuth method', () => {
    it('should contain AccountTreeController.init() call', () => {
      expect(authenticationSource).toContain('AccountTreeController.init();');
    });

    it('should contain AccountsController.updateAccounts() call', () => {
      expect(authenticationSource).toContain('AccountsController.updateAccounts();');
    });

    it('should call AccountTreeController.init before AccountsController.updateAccounts in userEntryAuth', () => {
      // Find the userEntryAuth method
      const userEntryAuthMatch = authenticationSource.match(
        /userEntryAuth\s*=\s*async\s*\([^)]*\)[^{]*{([\s\S]*?)}/
      );

      expect(userEntryAuthMatch).toBeTruthy();

      if (userEntryAuthMatch) {
        const methodBody = userEntryAuthMatch[1];
        const initIndex = methodBody.indexOf('AccountTreeController.init();');
        const updateIndex = methodBody.indexOf('AccountsController.updateAccounts();');

        expect(initIndex).toBeGreaterThan(-1);
        expect(updateIndex).toBeGreaterThan(-1);
        expect(initIndex).toBeLessThan(updateIndex);
      }
    });
  });

  describe('appTriggeredAuth method', () => {
    it('should call AccountTreeController.init before AccountsController.updateAccounts in appTriggeredAuth', () => {
      // Find the appTriggeredAuth method
      const appTriggeredAuthMatch = authenticationSource.match(
        /appTriggeredAuth\s*=\s*async\s*\([^)]*\)[^{]*{([\s\S]*?)}/
      );

      expect(appTriggeredAuthMatch).toBeTruthy();

      if (appTriggeredAuthMatch) {
        const methodBody = appTriggeredAuthMatch[1];
        const initIndex = methodBody.indexOf('AccountTreeController.init();');
        const updateIndex = methodBody.indexOf('AccountsController.updateAccounts();');

        expect(initIndex).toBeGreaterThan(-1);
        expect(updateIndex).toBeGreaterThan(-1);
        expect(initIndex).toBeLessThan(updateIndex);
      }
    });
  });

  describe('Engine context destructuring', () => {
    it('should destructure AccountTreeController and AccountsController from Engine.context in userEntryAuth', () => {
      const userEntryAuthMatch = authenticationSource.match(
        /userEntryAuth\s*=\s*async\s*\([^)]*\)[^{]*{([\s\S]*?)}/
      );

      expect(userEntryAuthMatch).toBeTruthy();

      if (userEntryAuthMatch) {
        const methodBody = userEntryAuthMatch[1];
        expect(methodBody).toMatch(/{\s*AccountTreeController,\s*AccountsController\s*}\s*=\s*Engine\.context/);
      }
    });

    it('should destructure AccountTreeController and AccountsController from Engine.context in appTriggeredAuth', () => {
      const appTriggeredAuthMatch = authenticationSource.match(
        /appTriggeredAuth\s*=\s*async\s*\([^)]*\)[^{]*{([\s\S]*?)}/
      );

      expect(appTriggeredAuthMatch).toBeTruthy();

      if (appTriggeredAuthMatch) {
        const methodBody = appTriggeredAuthMatch[1];
        expect(methodBody).toMatch(/{\s*AccountTreeController,\s*AccountsController\s*}\s*=\s*Engine\.context/);
      }
    });
  });
});
