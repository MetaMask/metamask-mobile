import { BtcAccountType, KeyringAccountType } from '@metamask/keyring-api';

export const btcAccountTypeLabel: Partial<Record<KeyringAccountType, string>> =
  {
    [BtcAccountType.P2pkh]: 'Legacy',
    [BtcAccountType.P2sh]: 'Nested SegWit',
    [BtcAccountType.P2wpkh]: 'Native SegWit',
    [BtcAccountType.P2tr]: 'Taproot',
  };
