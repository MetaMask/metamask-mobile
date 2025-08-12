import { KeyringMetadata, KeyringObject } from '@metamask/keyring-controller';

export interface SRPListItemProps {
  name: string;
  keyring: KeyringObject & {
    metadata: KeyringMetadata;
  };
  testID?: string;
  onActionComplete: (id: string) => void;
}
