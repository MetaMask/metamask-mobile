/* eslint-disable import/no-nodejs-modules */
/**
 * Export Fixture Script
 *
 * This Jest test exports fixture states to JSON files for use with Maestro tests.
 * Run with: yarn jest e2e/maestro/scripts/export-fixture.test.ts
 */

import fs from 'fs';
import path from 'path';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';

const FIXTURES_DIR = path.join(__dirname, '../fixtures');

// Ensure fixtures directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

describe('Export Fixtures for Maestro', () => {
  it('exports default fixture', () => {
    const fixture = new FixtureBuilder().build();
    const filePath = path.join(FIXTURES_DIR, 'default.json');
    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2));
    console.log(`✅ Exported: ${filePath}`);
    expect(fixture).toBeDefined();
  });

  it('exports import-srp fixture', () => {
    const fixture = new FixtureBuilder()
      .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
      .build();
    const filePath = path.join(FIXTURES_DIR, 'import-srp.json');
    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2));
    console.log(`✅ Exported: ${filePath}`);
    expect(fixture).toBeDefined();
  });

  it('exports with-tokens fixture', () => {
    const fixture = new FixtureBuilder()
      .withTokensForAllPopularNetworks([
        {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
        },
      ])
      .build();
    const filePath = path.join(FIXTURES_DIR, 'with-tokens.json');
    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2));
    console.log(`✅ Exported: ${filePath}`);
    expect(fixture).toBeDefined();
  });

  it('exports with-multiple-accounts fixture', () => {
    const fixture = new FixtureBuilder()
      .withKeyringControllerOfMultipleAccounts()
      .build();
    const filePath = path.join(FIXTURES_DIR, 'with-multiple-accounts.json');
    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2));
    console.log(`✅ Exported: ${filePath}`);
    expect(fixture).toBeDefined();
  });
});
