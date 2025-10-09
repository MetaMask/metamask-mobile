import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { GasFeeTokenIcon } from './gas-fee-token-icon';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/useNetworkInfo');
jest.mock('../../../hooks/tokens/useTokenWithBalance', () => ({
  useTokenWithBalance: jest
    .fn()
    .mockReturnValue({ asset: { logo: 'logo.png' } }),
}));

describe('GasFeeTokenIcon', () => {
  const mockUseNetworkInfo = jest.mocked(useNetworkInfo);
  const mockUseTokenWithBalance = jest.mocked(useTokenWithBalance);

  beforeEach(() => {
    mockUseNetworkInfo.mockReturnValue({
      networkImage: 10,
      networkNativeCurrency: 'ETH',
      networkName: 'Ethereum',
    });
    jest.clearAllMocks();
  });

  it('renders the token icon when tokenAddress is not the native', () => {
    const tokenAddress = '0xTokenAddress';

    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={tokenAddress} />,
      { state: transferTransactionStateMock },
    );

    expect(getByTestId('token-icon')).toBeOnTheScreen();
  });

  it('renders the native token icon when tokenAddress is the native', () => {
    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={NATIVE_TOKEN_ADDRESS} />,
      { state: transferTransactionStateMock },
    );

    expect(getByTestId('native-icon')).toBeOnTheScreen();
  });

  it('renders native icon when asset is not found', () => {
    mockUseTokenWithBalance.mockReturnValue({
      asset: undefined,
      displayName: undefined,
    } as unknown as ReturnType<typeof mockUseTokenWithBalance>);

    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={NATIVE_TOKEN_ADDRESS} />,
      { state: transferTransactionStateMock },
    );

    expect(getByTestId('native-icon')).toBeOnTheScreen();
  });
});
