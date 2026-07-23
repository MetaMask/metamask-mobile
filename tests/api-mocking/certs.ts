/* eslint-disable import-x/no-nodejs-modules */
/* eslint-disable import-x/no-namespace */
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';
import { generateCACertificate } from 'mockttp';

export interface E2ECaPaths {
  certPath: string;
  keyPath: string;
}

const CERT_FILE = 'ca.pem';
const KEY_FILE = 'ca.key';

export const DEFAULT_CA_CACHE_DIR = path.join(__dirname, '.cert-cache');

export async function ensureE2ECa(cacheDir: string): Promise<E2ECaPaths> {
  const certPath = path.join(cacheDir, CERT_FILE);
  const keyPath = path.join(cacheDir, KEY_FILE);

  if (fsSync.existsSync(certPath) && fsSync.existsSync(keyPath)) {
    return { certPath, keyPath };
  }

  await fs.mkdir(cacheDir, { recursive: true });

  const { cert, key } = await generateCACertificate({
    commonName: 'MetaMask E2E Mock CA',
    organizationName: 'MetaMask',
  });

  await fs.writeFile(certPath, cert);
  await fs.writeFile(keyPath, key, { mode: 0o600 });

  return { certPath, keyPath };
}
