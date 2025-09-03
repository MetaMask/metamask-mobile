import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { GasFeeTokenIcon } from './gas-fee-token-icon';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/useNetworkInfo');

describe('GasFeeTokenIcon', () => {
  const mockUseNetworkInfo = jest.mocked(useNetworkInfo);

  beforeEach(() => {
    mockUseNetworkInfo.mockReturnValue({
      networkImage: 10,
      networkNativeCurrency: 'ETH',
      networkName: 'Ethereum',
    });
    jest.clearAllMocks();
  });

  it('renders the token icon when tokenAddress is not the native token address', () => {
    const tokenAddress = '0xTokenAddress';

    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={tokenAddress} />,
      { state: transferTransactionStateMock },
    );

    expect(getByTestId('token-icon')).toBeOnTheScreen();
  });

  it('renders the native token icon when tokenAddress is the native token address', () => {
    const tokenAddress = NATIVE_TOKEN_ADDRESS;

    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={tokenAddress} />,
      { state: transferTransactionStateMock },
    );

    expect(getByTestId('native-icon')).toBeOnTheScreen();
  });
});
