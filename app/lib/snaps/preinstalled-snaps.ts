import type { PreinstalledSnap } from '@metamask/snaps-controllers';
import MessageSigningSnap from '@metamask/message-signing-snap/dist/preinstalled-snap.json';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import SolanaWalletSnap from '@metamask/solana-wallet-snap/dist/preinstalled-snap.json';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
import BitcoinWalletSnap from '@metamask/bitcoin-wallet-snap/dist/preinstalled-snap.json';
///: END:ONLY_INCLUDE_IF

const PREINSTALLED_SNAPS: readonly PreinstalledSnap[] = Object.freeze([
  MessageSigningSnap as PreinstalledSnap,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  SolanaWalletSnap as unknown as PreinstalledSnap,
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  BitcoinWalletSnap as unknown as PreinstalledSnap,
  ///: END:ONLY_INCLUDE_IF
]);

export default PREINSTALLED_SNAPS;
