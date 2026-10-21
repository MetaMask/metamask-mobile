import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';

export const getActiveCredentials = (credentials: EnrolledCredential[]) =>
  credentials.filter(({ status }) => status === 'active');

export const getActivePasskeys = (credentials: EnrolledCredential[]) =>
  getActiveCredentials(credentials).filter(({ type }) => type === 'passkey');
