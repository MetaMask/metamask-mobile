import { bytesToHex } from '@metamask/utils';
import {
  getCubistConfig,
  isMfaRecoveryConfigured,
  tryGetCubistKeys,
} from './config';
import { MFA_CONFIG } from './mfa-config';

const originalEnv = { ...process.env };
const originalDevConfig = { ...MFA_CONFIG.dev };
const WRAP_PUBLIC_KEY = new Uint8Array(32).fill(1);
const RECEIPT_PUBLIC_KEY = new Uint8Array(32).fill(2);

describe('MFA recovery configuration', () => {
  beforeEach(() => {
    process.env.METAMASK_ENVIRONMENT = 'dev';
    Object.assign(MFA_CONFIG.dev, {
      wrapPublicKey: bytesToHex(WRAP_PUBLIC_KEY),
      receiptPublicKey: bytesToHex(RECEIPT_PUBLIC_KEY),
    });
  });

  afterEach(() => {
    Object.assign(MFA_CONFIG.dev, originalDevConfig);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('parses the configured Cubist values', () => {
    expect(getCubistConfig()).toEqual({
      environment: 'gamma',
      orgId: 'Org#5eade91b-cd05-4af6-a974-77f63cc344f6',
      wrapPublicKey: WRAP_PUBLIC_KEY,
      receiptPublicKey: RECEIPT_PUBLIC_KEY,
      scopes: ['manage:policy:get', 'manage:policy:invoke'],
      registrationUrl: 'https://recovery-registration.dev-api.cx.metamask.io',
    });
    expect(isMfaRecoveryConfigured()).toBe(true);
  });

  it('rejects escrow keys that are not raw 32-byte public keys', () => {
    MFA_CONFIG.dev.wrapPublicKey = '{"kty":"EC","crv":"P-256"}';

    expect(() => getCubistConfig()).toThrow('MFA_CONFIG.wrapPublicKey');
    expect(isMfaRecoveryConfigured()).toBe(false);
  });

  it('returns the configured escrow keys', () => {
    expect(tryGetCubistKeys()).toEqual({
      wrapPublicKey: WRAP_PUBLIC_KEY,
      receiptPublicKey: RECEIPT_PUBLIC_KEY,
    });
  });

  it('returns empty keys instead of throwing when the configuration is invalid', () => {
    MFA_CONFIG.dev.wrapPublicKey = 'not-a-key';

    expect(() => tryGetCubistKeys()).not.toThrow();
    expect(tryGetCubistKeys()).toEqual({
      wrapPublicKey: new Uint8Array(),
      receiptPublicKey: new Uint8Array(),
    });
  });

  it('reports false instead of throwing when a value is missing', () => {
    MFA_CONFIG.dev.orgId = '';

    expect(isMfaRecoveryConfigured()).toBe(false);
  });

  it('reports false when the selected configuration set is empty', () => {
    process.env.METAMASK_ENVIRONMENT = 'production';

    expect(() => getCubistConfig()).toThrow('MFA_CONFIG');
    expect(isMfaRecoveryConfigured()).toBe(false);
  });
});
