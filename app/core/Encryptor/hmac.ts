import { bytesToHex, bytesToString, hexToBytes, remove0x } from '@metamask/utils';
import { NativeModules } from 'react-native';

export async function hmacSha512(key: Uint8Array, data: Uint8Array) {
    const Aes = NativeModules.Aes;
    const bytes = await Aes.hmac512(bytesToString(data), remove0x(bytesToHex(key)));
    return hexToBytes(bytes);
}
