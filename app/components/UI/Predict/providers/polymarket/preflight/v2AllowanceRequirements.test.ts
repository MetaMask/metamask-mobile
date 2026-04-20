import { PERMIT2_ADDRESS } from '../safe/constants';
import { POLYMARKET_V2_PROTOCOL } from '../protocol/definitions';
import { getCanonicalV2AllowanceRequirements } from './v2AllowanceRequirements';

describe('v2 allowance requirements', () => {
  it('returns the canonical requirement list in deterministic order', () => {
    const requirements = getCanonicalV2AllowanceRequirements();

    expect(requirements).toHaveLength(10);
    expect(requirements[0]).toEqual({
      type: 'erc20-allowance',
      tokenAddress: POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
      spender: POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
    });
    expect(requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'erc20-allowance',
          spender: PERMIT2_ADDRESS,
        }),
        expect.objectContaining({
          type: 'erc20-allowance',
          spender: POLYMARKET_V2_PROTOCOL.collateral.offrampAddress,
        }),
        expect.objectContaining({
          type: 'erc1155-operator',
          operator: POLYMARKET_V2_PROTOCOL.contracts.exchange,
        }),
      ]),
    );
  });
});
