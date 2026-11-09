import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import {
  diffLocale,
  evaluateExtractTagsFromLocaleKeys,
  longestStaticSegment,
} from './locale-key-impact';

const LOCALE = 'locales/languages/en.json';
const TAGS_IMPORT =
  "import { SmokeWalletPlatform } from '../../tags.js';\ndescribe('x', () => {});\n";

const rule = {
  name: 'en-locale-change',
  description: 'en.json keys changed',
  trigger: {
    type: 'extractTagsFromLocaleKeys',
    localeFile: LOCALE,
    usagePrefixes: ['app/', 'tests/'],
    copyLiteralPrefixes: ['tests/'],
    minCopyLiteralLength: 4,
    maxChangedKeys: 3,
    importGraph: {
      sourcePrefixes: ['app/', 'tests/page-objects/'],
      excludeSourceStems: ['index'],
      intermediatePrefixes: ['tests/page-objects/'],
      specPrefixes: ['tests/smoke-appium/'],
      catalogGroup: 'e2e',
      hop: 1,
    },
  },
};

const catalog = {
  e2e: [
    { id: 'SmokeWalletPlatform', description: '' },
    { id: 'SmokeAccounts', description: '' },
  ],
};

const baseLocale = {
  wallet: { title: 'Wallet', receive: 'Receive funds' },
  accounts: { add: 'Add account' },
  perps: { tabs: { positions: 'Positions' } },
  unused: { label: 'Never shown' },
};

const baseFiles: Record<string, string> = {
  'app/components/Views/Wallet/WalletHeader.tsx':
    "export const t = strings('wallet.title');\n",
  'app/components/Views/Perps/PerpsTabs.tsx':
    'export const t = (id: string) => strings(`perps.tabs.${id}`);\n',
  'tests/page-objects/wallet/WalletView.ts':
    "import enContent from '../../../locales/languages/en.json';\n" +
    'export const RECEIVE = enContent.wallet.receive;\n',
  'tests/page-objects/accounts/AccountSheet.ts':
    "export const ADD = 'Add account';\n",
  'tests/smoke-appium/wallet/wallet.spec.ts':
    "import WalletView from '../../page-objects/wallet/WalletView';\n" +
    "import { WalletHeader } from '../../../app/components/Views/Wallet/WalletHeader';\n" +
    TAGS_IMPORT,
  'tests/smoke-appium/accounts/accounts.spec.ts':
    "import AccountSheet from '../../page-objects/accounts/AccountSheet';\n" +
    "import { SmokeAccounts } from '../../tags.js';\n",
};

let repo: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
}

function write(path: string, content: string): void {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), content);
}

function headLocale(locale: unknown): void {
  write(LOCALE, `${JSON.stringify(locale, null, 2)}\n`);
}

function evaluate(changedFiles: string[] = [LOCALE]) {
  return evaluateExtractTagsFromLocaleKeys(
    rule,
    changedFiles,
    { baseDir: repo, baseBranch: 'base' },
    catalog,
    (path) => path,
  );
}

describe('locale-key-impact', () => {
  before(() => {
    repo = mkdtempSync(join(tmpdir(), 'locale-impact-'));
    git('init', '-q', '-b', 'base');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'test');
    for (const [path, content] of Object.entries(baseFiles)) {
      write(path, content);
    }
    headLocale(baseLocale);
    git('add', '.');
    git('commit', '-q', '-m', 'base');
    git('checkout', '-q', '-b', 'pr');
  });

  after(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  describe('diffLocale', () => {
    it('separates added keys from modified and removed keys', () => {
      const result = diffLocale(
        { a: { b: 'one', c: 'two' } },
        { a: { b: 'ONE', d: 'new' } },
      );

      assert.deepEqual(result.added, ['a.d']);
      assert.deepEqual(result.changed, [
        { key: 'a.b', kind: 'modified', oldValue: 'one' },
        { key: 'a.c', kind: 'removed', oldValue: 'two' },
      ]);
    });
  });

  describe('longestStaticSegment', () => {
    it('skips interpolation placeholders', () => {
      assert.equal(
        longestStaticSegment('Send {{amount}} to your account now'),
        'to your account now',
      );
    });
  });

  describe('evaluateExtractTagsFromLocaleKeys', () => {
    it('does not match when the locale file is not in the PR', () => {
      assert.equal(evaluate(['app/foo.ts']), null);
    });

    it('does not match when keys are only added', () => {
      headLocale({ ...baseLocale, extra: { key: 'New copy' } });

      assert.equal(evaluate(), null);
    });

    it('traces strings() key literals in app code through the import graph', () => {
      headLocale({
        ...baseLocale,
        wallet: { ...baseLocale.wallet, title: 'Home' },
      });

      const result = evaluate();

      assert.deepEqual(result?.selectedTags, ['SmokeWalletPlatform']);
      assert.match(String(result?.detail), /wallet\.title/);
    });

    it('traces enContent.<key> references in E2E page objects', () => {
      headLocale({
        ...baseLocale,
        wallet: { ...baseLocale.wallet, receive: 'Receive' },
      });

      assert.deepEqual(evaluate()?.selectedTags, ['SmokeWalletPlatform']);
    });

    it('traces the old copy hardcoded as a literal in tests', () => {
      headLocale({ ...baseLocale, accounts: { add: 'Create account' } });

      assert.deepEqual(evaluate()?.selectedTags, ['SmokeAccounts']);
    });

    it('seeds the AI with consumers when no smoke spec is reached', () => {
      headLocale({ ...baseLocale, perps: { tabs: { positions: 'Open' } } });

      const result = evaluate();

      assert.deepEqual(result?.selectedTags, []);
      assert.equal(result?.confidence, 0);
      assert.match(
        String(result?.detail),
        /app\/components\/Views\/Perps\/PerpsTabs\.tsx/,
      );
    });

    it('unions tags from other changed files in the PR', () => {
      headLocale({ ...baseLocale, unused: { label: 'Still never shown' } });

      const result = evaluate([
        LOCALE,
        'tests/page-objects/accounts/AccountSheet.ts',
      ]);

      assert.deepEqual(result?.selectedTags, ['SmokeAccounts']);
      assert.match(String(result?.detail), /no consumers found for 1 key/);
    });

    it('runs ALL when more keys change than the limit allows', () => {
      headLocale({
        wallet: { title: 'a', receive: 'b' },
        accounts: { add: 'c' },
        perps: { tabs: { positions: 'd' } },
        unused: { label: 'Never shown' },
      });

      assert.deepEqual(evaluate()?.selectedTags, ['ALL']);
    });

    it('runs ALL when the locale file is not valid JSON', () => {
      write(LOCALE, '{ not json');

      const result = evaluate();

      assert.deepEqual(result?.selectedTags, ['ALL']);
      assert.match(String(result?.detail), /could not read/);
    });
  });
});
