import { resolveCardFundingAddress } from './resolveCardFundingAddress';

describe('resolveCardFundingAddress', () => {
  it('prefers an explicit routed address over Card Home and selection', () => {
    expect(
      resolveCardFundingAddress({
        preferredAddress: '0xpreferred',
        primaryFundingWalletAddress: '0xfunding',
        selectedEvmAddress: '0xselected',
      }),
    ).toBe('0xpreferred');
  });

  it('uses the Card Home funding wallet when no preferred address is set', () => {
    expect(
      resolveCardFundingAddress({
        preferredAddress: null,
        primaryFundingWalletAddress: '0xfunding',
        selectedEvmAddress: '0xselected',
      }),
    ).toBe('0xfunding');
  });

  it('falls back to the selected EVM account during early onboarding', () => {
    expect(
      resolveCardFundingAddress({
        preferredAddress: undefined,
        primaryFundingWalletAddress: undefined,
        selectedEvmAddress: '0xselected',
      }),
    ).toBe('0xselected');
  });

  it('returns undefined when no address is available', () => {
    expect(
      resolveCardFundingAddress({
        preferredAddress: null,
        primaryFundingWalletAddress: '',
        selectedEvmAddress: undefined,
      }),
    ).toBeUndefined();
  });
});
