import {
  parseTypedSignDataMessage,
  sanitizeString,
  stripMultipleNewlines,
} from '.';

describe('string utils', () => {
  describe('sanitizeString', () => {
    it('should escape all occurences of \u202E in text', async () => {
      const result = sanitizeString('test \u202E test \u202E test');
      expect(result).toEqual('test \\u202E test \\u202E test');
    });
    it('should return a non-string value as it is', async () => {
      const result = sanitizeString({ test: 'test \u202E test \u202E test' });
      expect(result.test).toEqual('test \u202E test \u202E test');
    });
  });

  describe('stripMultipleNewlines', () => {
    it('replace multiple newline characters in string with single newline character', async () => {
      const result = stripMultipleNewlines(
        'Secure ✅ \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n',
      );
      expect(result).toEqual('Secure ✅ \n');
    });
    it('does nothing if passed value is not defined or not a string type', async () => {
      expect(stripMultipleNewlines(123 as any)).toEqual(123);
      expect(stripMultipleNewlines(undefined as any)).not.toBeDefined();
    });
  });

  describe('parseTypedSignDataMessage', () => {
    const typedDataMsg =
      '{"domain":{"chainId":97,"name":"Ether Mail","verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC","version":"1"},"message":{"contents":"Hello, Bob!","from":{"name":"Cow","wallets":["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826","0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF","0x06195827297c7A80a443b6894d3BDB8824b43896"]},"to":[{"name":"Bob","wallets":["0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB","0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57","0xB0B0b0b0b0b0B000000000000000000000000000"]}]},"primaryType":"Mail","types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person[]"},{"name":"contents","type":"string"}],"Person":[{"name":"name","type":"string"},{"name":"wallets","type":"address[]"}]}}';

    it('should throw an error if types is undefined', () => {
      const typedDataMsgWithoutTypes =
        '{"domain":{"chainId":97,"name":"Ether Mail","verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC","version":"1"},"message":{"contents":"Hello, Bob!","from":{"name":"Cow","wallets":["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826","0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF","0x06195827297c7A80a443b6894d3BDB8824b43896"]},"to":[{"name":"Bob","wallets":["0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB","0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57","0xB0B0b0b0b0b0B000000000000000000000000000"]}]},"primaryType":"Mail"}';
      expect(() => parseTypedSignDataMessage(typedDataMsgWithoutTypes)).toThrow(
        'Invalid types definition',
      );
    });

    it('should throw an error if base type is not defined', () => {
      const typedSignDataWithoutBaseType =
        '{"domain":{"chainId":97,"name":"Ether Mail","verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC","version":"1"},"message":{"contents":"Hello, Bob!","from":{"name":"Cow","wallets":["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826","0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF","0x06195827297c7A80a443b6894d3BDB8824b43896"]},"to":[{"name":"Bob","wallets":["0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB","0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57","0xB0B0b0b0b0b0B000000000000000000000000000"]}]},"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person[]"},{"name":"contents","type":"string"}],"Person":[{"name":"name","type":"string"},{"name":"wallets","type":"address[]"}]}}';
      expect(() =>
        parseTypedSignDataMessage(typedSignDataWithoutBaseType),
      ).toThrow('Invalid primary type definition');
    });

    it('should return ignore message data with unknown types and trim new lines', () => {
      const result = parseTypedSignDataMessage(typedDataMsg);
      expect(result).toStrictEqual({
        value: {
          string: { value: 'Secure ✅ \n', type: 'string' },
          object: {
            value: {
              address: {
                value: '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
                type: 'address',
              },
              uint: { value: 42, type: 'uint256' },
            },
            type: 'object',
          },
        },
        type: 'payload',
      });
    });
  });
});
