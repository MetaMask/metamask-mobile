import type { SerializedUR } from '@metamask/eth-qr-keyring';
import { URRegistryDecoder } from '@keystonehq/ur-decoder';

/**
 * Simulator / dev-only: skip the QR camera when pairing a QR hardware wallet.
 *
 * Set {@link DEV_BYPASS_QR_HARDWARE_PAIR} to `true` locally, then revert before
 * shipping. Pairing is auto-resolved in `Engine` when this flag is on (works in
 * release simulator builds too — not tied to `__DEV__`).
 *
 * Edit {@link DEV_QR_HARDWARE_PAIR_SOURCE_UR_STRING} with your real
 * `UR:CRYPTO-HDKEY/...` (or `UR:CRYPTO-ACCOUNT/...`) text from the device.
 * {@link DEV_QR_HARDWARE_PAIR_SERIALIZED_UR} is derived automatically at load time.
 */
export const DEV_BYPASS_QR_HARDWARE_PAIR = true;

/**
 * Paste the exact BC-UR string from your hardware wallet (single-part UR).
 * This is the only value you need to keep in sync with the device.
 */
export const DEV_QR_HARDWARE_PAIR_SOURCE_UR_STRING =
  'UR:CRYPTO-HDKEY/ONAXHDCLAXNDTACLNNONMHJPHHCLGYFXLPENRTLBUELYLFGYGOWLRFWDKOBDSBLBASFTCPGHLEAAHDCXPLWTROJSOSFZIYCFGEECBGYKTLLORHFXJNMWLBJKBDAXHGTSJSMOWZNETOLBWLRPAMTAADDYOEADLNCSDWYKCSFNYKAEYKAOCYIOZCLYMKAYCYIHEYHSDYASJKFPINJPFLHSJOCXDPCXISIHJZJZJLKTJLJPJZIEHSTAVOGE' as const;

/**
 * Mirrors `ConnectQRHardware` `onScanSuccess`: same decoder class as
 * `AnimatedQRScanner` and the same `{ type, cbor }` serialization as a successful
 * camera scan (single-part UR only — multipart must be scanned normally).
 */
function pairSourceUrStringToSerializedUr(urString: string): SerializedUR {
  const ur = URRegistryDecoder.decode(urString.toLowerCase());
  return {
    type: ur.type,
    cbor: ur.cbor.toString('hex'),
  };
}

/** Same payload as {@link DEV_QR_HARDWARE_PAIR_SOURCE_UR_STRING}, in keyring form. */
export const DEV_QR_HARDWARE_PAIR_SERIALIZED_UR: SerializedUR =
  pairSourceUrStringToSerializedUr(DEV_QR_HARDWARE_PAIR_SOURCE_UR_STRING);
