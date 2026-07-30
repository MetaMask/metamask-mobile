import type { PreinstalledSnap } from '@metamask/snaps-controllers';
import MessageSigningSnap from '@metamask/message-signing-snap/dist/preinstalled-snap.json';
import ENSResolverSnap from '@metamask/ens-resolver-snap/dist/preinstalled-snap.json';
import SolanaWalletSnap from '@metamask/solana-wallet-snap/dist/preinstalled-snap.json';
import BitcoinWalletSnap from '@metamask/bitcoin-wallet-snap/dist/preinstalled-snap.json';
import PreinstalledExampleSnap from '@metamask/preinstalled-example-snap/dist/preinstalled-snap.json';
import { isTestEnvironment } from '../../util/test/utils';
import TronWalletSnap from '@metamask/tron-wallet-snap/dist/preinstalled-snap.json';

const PREINSTALLED_SNAPS: readonly PreinstalledSnap[] = Object.freeze([
  ENSResolverSnap as unknown as PreinstalledSnap,
  MessageSigningSnap as unknown as PreinstalledSnap,
  SolanaWalletSnap as unknown as PreinstalledSnap,
  BitcoinWalletSnap as unknown as PreinstalledSnap,
  ...(isTestEnvironment
    ? [PreinstalledExampleSnap as unknown as PreinstalledSnap]
    : []),
  TronWalletSnap as unknown as PreinstalledSnap,
]);

export default PREINSTALLED_SNAPS;
