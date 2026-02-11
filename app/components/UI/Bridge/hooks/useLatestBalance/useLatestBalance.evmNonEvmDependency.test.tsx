import {
  initialState,
  solanaNativeTokenAddress,
} from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useLatestBalance } from '.';
import { getProviderByChainId } from '../../../../../util/notifications/methods/common';
import { BigNumber, constants } from 'ethers';
import { waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';

const mockUseNonEvmTokensWithBalance = jest.fn();

jest.mock('../../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(),
}));

jest.mock('../useNonEvmTokensWithBalance', () => ({
  useNonEvmTokensWithBalance: () => mockUseNonEvmTokensWithBalance(),
}));

describe('useLatestBalance EVM/non-EVM dependencies', () => {
  const mockProvider = {
    getBalance: jest
      .fn()
      .mockResolvedValue(BigNumber.from('1000000000000000000')),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getProviderByChainId as jest.Mock).mockReturnValue(mockProvider);
    mockUseNonEvmTokensWithBalance.mockReturnValue([]);
  });

  it('does not retrigger EVM balance fetch when non-EVM token list changes', async () => {
    let nonEvmTokens: { address: string; chainId: string; balance: string }[] =
      [];
    mockUseNonEvmTokensWithBalance.mockImplementation(() => nonEvmTokens);

    const { rerender } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: constants.AddressZero,
          decimals: 18,
          chainId: '0x1' as Hex,
        }),
      { state: initialState },
    );

    await waitFor(() => {
      expect(mockProvider.getBalance).toHaveBeenCalledTimes(1);
    });

    nonEvmTokens = [
      {
        address: solanaNativeTokenAddress,
        chainId: SolScope.Mainnet,
        balance: '100.1',
      },
    ];

    rerender();

    await waitFor(() => {
      expect(mockProvider.getBalance).toHaveBeenCalledTimes(1);
    });
  });
});
