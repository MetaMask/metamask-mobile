import { InternalAccount } from '@metamask/keyring-internal-api';
import { Json } from '@metamask/utils';

export interface RevealPrivateCredentialParams {
  credentialName: string;
  shouldUpdateNav?: boolean;
  selectedAccount?: InternalAccount;
  keyringId?: Json;
}
