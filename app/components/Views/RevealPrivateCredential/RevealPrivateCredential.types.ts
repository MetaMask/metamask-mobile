import { InternalAccount } from '@metamask/keyring-internal-api';
import { Json } from '@metamask/utils';

export type RevealPrivateCredentialParams = {
  credentialName: string;
  shouldUpdateNav?: boolean;
  selectedAccount?: InternalAccount;
  keyringId?: Json;
};
