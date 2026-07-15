import { getUser, type UserRecord } from '../store/users.ts';
import type { KalshiCredential } from './client.ts';

export class MissingUserCredential extends Error {
  constructor(public readonly externalUserId: string) {
    super(`No per-user Kalshi PEM for externalUserId=${externalUserId}`);
  }
}

export function requireUserCredential(externalUserId: string): {
  user: UserRecord;
  credential: KalshiCredential;
} {
  const user = getUser(externalUserId);
  if (!user || !user.apiKey) {
    throw new MissingUserCredential(externalUserId);
  }
  return {
    user,
    credential: { apiKeyId: user.apiKey.keyId, pem: user.apiKey.pem },
  };
}
