import { KeyringMetadata, KeyringObject } from '@metamask/keyring-controller';

export interface SRPListItemProps {
  name: string;
  keyring: KeyringObject & {
    metadata: KeyringMetadata;
  };
  onActionComplete: (id: string) => void;
}
