import { PERMIT2_ADDRESS } from '../safe/constants';
import { POLYMARKET_V2_PROTOCOL } from '../protocol/definitions';
import {
  filterDepositWalletUnsupportedRequirements,
  getActiveV2AllowanceRequirements,
  getCanonicalV2AllowanceRequirements,
} from './v2AllowanceRequirements';

describe('v2 allowance requirements', () => {
  it('returns active v2 requirements without the legacy sweep requirement', () => {
    const requirements = getActiveV2AllowanceRequirements();

    expect(requirements).toHaveLength(8);
    expect(requirements).not.toContainEqual({
      type: 'erc20-allowance',
      tokenAddress: POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
      spender: POLYMARKET_V2_PROTOCOL.collateral.onrampAddress,
    });
  });

  it('returns the canonical requirement list in deterministic order', () => {
    const requirements = getCanonicalV2AllowanceRequirements();

    expect(requirements).toHaveLength(9);
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
          type: 'erc1155-operator',
          operator: POLYMARKET_V2_PROTOCOL.contracts.exchange,
        }),
      ]),
    );
  });

  it('filters Permit2 approvals from deposit-wallet requirements', () => {
    const requirements = getActiveV2AllowanceRequirements();
    const filteredRequirements =
      filterDepositWalletUnsupportedRequirements(requirements);

    expect(filteredRequirements).toHaveLength(requirements.length - 1);
    expect(filteredRequirements).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'erc20-allowance',
          spender: PERMIT2_ADDRESS,
        }),
      ]),
    );
    expect(filteredRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'erc20-allowance',
          spender: POLYMARKET_V2_PROTOCOL.contracts.exchange,
        }),
        expect.objectContaining({
          type: 'erc1155-operator',
          operator: POLYMARKET_V2_PROTOCOL.contracts.exchange,
        }),
      ]),
    );
  });
});
