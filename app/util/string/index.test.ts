import {
  parseTypedSignDataMessage,
  sanitizeMessage,
  sanitizeString,
  stripMultipleNewlines,
} from '.';
import { mockTypedSignV3Message } from '../test/confirm-data-helpers';

describe('string utils', () => {
  describe('sanitizeString', () => {
    it('escapes all occurences of \u202E', () => {
      const result = sanitizeString('test \u202E test \u202E test');
      expect(result).toEqual('test \\u202E test \\u202E test');
    });

    it('escapes all occurences of \u202D and \u202E', () => {
      const result = sanitizeString('test \u202D test \u202E test \u202D test');
      expect(result).toEqual('test \\u202D test \\u202E test \\u202D test');
    });
  });

  describe('stripMultipleNewlines', () => {
    it('replace multiple newline characters in string with single newline character', async () => {
      const result = stripMultipleNewlines(
        'Secure ✅ \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n',
      );
      expect(result).toEqual('Secure ✅ \n');
    });
  });

  describe('sanitizeMessage', () => {
    it('should throw an error if types is undefined', () => {
      const { message, primaryType } = mockTypedSignV3Message;
      expect(() => sanitizeMessage(message, primaryType, undefined)).toThrow(
        'Invalid types definition',
      );
    });

    it('should throw an error if base type is not defined', () => {
      const { message, types } = mockTypedSignV3Message;
      expect(() => sanitizeMessage(message, '', types)).toThrow(
        'Invalid primary type definition',
      );
    });

    it('should return message data as expected', () => {
      const { message, primaryType, types } = mockTypedSignV3Message;
      const result = sanitizeMessage(message, primaryType, types);
      expect(result).toStrictEqual({
        value: {
          from: {
            value: {
              name: { value: 'Cow', type: 'string' },
              wallet: {
                value: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                type: 'address',
              },
            },
            type: 'Person',
          },
          to: {
            value: {
              name: { value: 'Bob', type: 'string' },
              wallet: {
                value: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
                type: 'address',
              },
            },
            type: 'Person',
          },
          contents: { value: 'Hello, Bob!', type: 'string' },
        },
        type: 'Mail',
      });
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

    it('should return message data ignoring unknown types and trim new lines', () => {
      const result = parseTypedSignDataMessage(typedDataMsg);
      expect(result).toStrictEqual({
        value: {
          contents: { value: 'Hello, Bob!', type: 'string' },
          from: {
            value: {
              name: { value: 'Cow', type: 'string' },
              wallets: {
                value: [
                  {
                    value: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                    type: 'address',
                  },
                  {
                    value: '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
                    type: 'address',
                  },
                  {
                    value: '0x06195827297c7A80a443b6894d3BDB8824b43896',
                    type: 'address',
                  },
                ],
                type: 'address[]',
              },
            },
            type: 'Person',
          },
          to: {
            value: [
              {
                value: {
                  name: { value: 'Bob', type: 'string' },
                  wallets: {
                    value: [
                      {
                        value: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
                        type: 'address',
                      },
                      {
                        value: '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
                        type: 'address',
                      },
                      {
                        value: '0xB0B0b0b0b0b0B000000000000000000000000000',
                        type: 'address',
                      },
                    ],
                    type: 'address[]',
                  },
                },
                type: 'Person',
              },
            ],
            type: 'Person[]',
          },
        },
        type: 'Mail',
      });
    });
  });
});
