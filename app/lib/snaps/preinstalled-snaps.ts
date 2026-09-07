import type { PreinstalledSnap } from '@metamask/snaps-controllers';
import MessageSigningSnap from '@metamask/message-signing-snap/dist/preinstalled-snap.json';
import ENSResolverSnap from '@metamask/ens-resolver-snap/dist/preinstalled-snap.json';
///: BEGIN:ONLY_INCLUDE_IF(solana)
import SolanaWalletSnap from '@metamask/solana-wallet-snap/dist/preinstalled-snap.json';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
import BitcoinWalletSnap from '@metamask/bitcoin-wallet-snap/dist/preinstalled-snap.json';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import PreinstalledExampleSnap from '@metamask/preinstalled-example-snap/dist/preinstalled-snap.json';
import { isTestEnvironment } from '../../util/test/utils';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(tron)
import TronWalletSnap from '@metamask/tron-wallet-snap/dist/preinstalled-snap.json';
///: END:ONLY_INCLUDE_IF
import StellarWalletSnap from '@metamask/stellar-wallet-snap/dist/preinstalled-snap.json';

const PREINSTALLED_SNAPS: readonly PreinstalledSnap[] = Object.freeze([
  ENSResolverSnap as unknown as PreinstalledSnap,
  MessageSigningSnap as unknown as PreinstalledSnap,
  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  SolanaWalletSnap as unknown as PreinstalledSnap,
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  BitcoinWalletSnap as unknown as PreinstalledSnap,
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  ...(isTestEnvironment
    ? [PreinstalledExampleSnap as unknown as PreinstalledSnap]
    : []),
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TronWalletSnap as unknown as PreinstalledSnap,
  ///: END:ONLY_INCLUDE_IF
  StellarWalletSnap as unknown as PreinstalledSnap,
]);

export default PREINSTALLED_SNAPS;
