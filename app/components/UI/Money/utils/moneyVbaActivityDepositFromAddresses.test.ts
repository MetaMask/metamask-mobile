import { parseMoneyVbaActivityDepositFromAddresses } from './moneyVbaActivityDepositFromAddresses';

describe('parseMoneyVbaActivityDepositFromAddresses', () => {
  it.each([
    ['missing', undefined],
    ['null', null],
    ['object', {}],
    ['string', '0x0000000000000000000000000000000000000001'],
    ['empty array', []],
  ])(
    'returns an empty allowlist for %s configuration',
    (_label, configuration) => {
      const result = parseMoneyVbaActivityDepositFromAddresses(configuration);

      expect(result).toEqual([]);
    },
  );

  it('returns an empty allowlist when any configured entry is malformed', () => {
    const result = parseMoneyVbaActivityDepositFromAddresses([
      '0x0000000000000000000000000000000000000001',
      'not-an-address',
    ]);

    expect(result).toEqual([]);
  });

  it('normalizes and deduplicates valid sender addresses', () => {
    const result = parseMoneyVbaActivityDepositFromAddresses([
      '0x000000000000000000000000000000000000000A',
      '0x000000000000000000000000000000000000000b',
      '0x000000000000000000000000000000000000000a',
    ]);

    expect(result).toEqual([
      '0x000000000000000000000000000000000000000a',
      '0x000000000000000000000000000000000000000b',
    ]);
  });

  it('parses each new allowlist when sender addresses rotate', () => {
    const firstSender = '0x000000000000000000000000000000000000000a';
    const secondSender = '0x000000000000000000000000000000000000000b';

    const firstResult = parseMoneyVbaActivityDepositFromAddresses([
      firstSender,
    ]);
    const overlapResult = parseMoneyVbaActivityDepositFromAddresses([
      firstSender,
      secondSender,
    ]);
    const rotatedResult = parseMoneyVbaActivityDepositFromAddresses([
      secondSender,
    ]);

    expect(firstResult).toEqual([firstSender]);
    expect(overlapResult).toEqual([firstSender, secondSender]);
    expect(rotatedResult).toEqual([secondSender]);
  });
});
