import { selectPerpsSelectedAccountAddress } from '.';

describe('selectPerpsSelectedAccountAddress', () => {
  it('normalizes the selected EVM account address', () => {
    expect(
      selectPerpsSelectedAccountAddress.resultFunc({
        address: '0xAbCdEf',
      } as Parameters<typeof selectPerpsSelectedAccountAddress.resultFunc>[0]),
    ).toBe('0xabcdef');
  });

  it('returns undefined when the selected group has no EVM account', () => {
    expect(selectPerpsSelectedAccountAddress.resultFunc(null)).toBeUndefined();
  });
});
