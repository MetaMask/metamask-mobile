import type { PreinstalledSnap } from '@metamask/snaps-controllers';
import MessageSigningSnap from '@metamask/message-signing-snap/dist/preinstalled-snap.json';
import BitcoinSnap from '@metamask/bitcoin-wallet-snap/dist/preinstalled-snap.json';

const PREINSTALLED_SNAPS: readonly PreinstalledSnap[] = Object.freeze([
  MessageSigningSnap as PreinstalledSnap,
  BitcoinSnap as unknown as PreinstalledSnap,
]);

export default PREINSTALLED_SNAPS;
