import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function readAdminPem(): string {
  const inline = process.env.KALSHI_ADMIN_PEM;
  if (inline) {
    return inline.includes('\\n') ? inline.replace(/\\n/g, '\n') : inline;
  }
  const pemPath = process.env.KALSHI_ADMIN_PEM_PATH;
  if (!pemPath) {
    throw new Error(
      'Provide KALSHI_ADMIN_PEM (inline) or KALSHI_ADMIN_PEM_PATH (file).',
    );
  }
  const resolved = path.isAbsolute(pemPath)
    ? pemPath
    : path.resolve(here, '..', pemPath);
  return fs.readFileSync(resolved, 'utf8');
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  kalshi: {
    baseUrl: (process.env.KALSHI_BASE_URL ?? 'https://external-api.demo.kalshi.co').replace(
      /\/$/,
      '',
    ),
    adminApiKeyId: required('KALSHI_ADMIN_API_KEY_ID'),
    adminPem: readAdminPem(),
    debug: process.env.KALSHI_DEBUG === 'true',
  },
};

export type Config = typeof config;
