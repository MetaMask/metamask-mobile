import { NativeModules } from 'react-native';
import { hmacSha512 } from './hmac';
import { hmac as nobleHmac } from '@noble/hashes/hmac';
import { sha512 as nobleSha512 } from '@noble/hashes/sha512';
import { bytesToHex, hexToBytes, stringToBytes } from '@metamask/utils';

describe('hmacSha512', () => {
  NativeModules.Aes.hmac512 = jest
    .fn()
    .mockImplementation((data, key) =>
      bytesToHex(nobleHmac(nobleSha512, hexToBytes(key), stringToBytes(data))),
    );

  it('returns hash from native module', async () => {
    const key = new Uint8Array(32);
    const data = new Uint8Array(32);

    const result = await hmacSha512(key, data);
    expect(bytesToHex(result)).toBe(
      '0xbae46cebebbb90409abc5acf7ac21fdb339c01ce15192c52fb9e8aa11a8de9a4ea15a045f2be245fbb98916a9ae81b353e33b9c42a55380c5158241daeb3c6dd',
    );
  });
});
