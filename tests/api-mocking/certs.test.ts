/* eslint-disable import-x/no-nodejs-modules */
/* eslint-disable import-x/no-namespace */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { X509Certificate } from 'crypto';
import { ensureE2ECa } from './certs.ts';

describe('ensureE2ECa', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-ca-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates a CA when the cache directory is empty', async () => {
    const result = await ensureE2ECa(tmpDir);

    expect(fs.existsSync(result.certPath)).toBe(true);
    expect(fs.existsSync(result.keyPath)).toBe(true);
    expect(result.certPath).toBe(path.join(tmpDir, 'ca.pem'));
    expect(result.keyPath).toBe(path.join(tmpDir, 'ca.key'));
  });

  it('reuses cached files on subsequent calls without regenerating', async () => {
    const first = await ensureE2ECa(tmpDir);
    const firstCert = fs.readFileSync(first.certPath, 'utf-8');
    const firstKey = fs.readFileSync(first.keyPath, 'utf-8');

    const second = await ensureE2ECa(tmpDir);

    expect(second.certPath).toBe(first.certPath);
    expect(second.keyPath).toBe(first.keyPath);
    expect(fs.readFileSync(second.certPath, 'utf-8')).toBe(firstCert);
    expect(fs.readFileSync(second.keyPath, 'utf-8')).toBe(firstKey);
  });

  it('produces a valid X.509 certificate identifiable as the MetaMask E2E CA', async () => {
    const { certPath } = await ensureE2ECa(tmpDir);
    const certPem = fs.readFileSync(certPath, 'utf-8');

    const cert = new X509Certificate(certPem);
    expect(cert.subject).toContain('MetaMask');
  });

  it('creates the cache directory if it does not exist', async () => {
    const nested = path.join(tmpDir, 'nested', 'cert-cache');
    expect(fs.existsSync(nested)).toBe(false);

    const result = await ensureE2ECa(nested);

    expect(fs.existsSync(nested)).toBe(true);
    expect(fs.existsSync(result.certPath)).toBe(true);
    expect(fs.existsSync(result.keyPath)).toBe(true);
  });
});
