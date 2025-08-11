import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { GasFeeTokenIcon } from './gas-fee-token-icon';

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/useNetworkInfo');

describe('GasFeeTokenIcon', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseNetworkInfo = jest.mocked(useNetworkInfo);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the token icon when tokenAddress is not the native token address', () => {
    const tokenAddress = '0xTokenAddress';
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
    } as unknown as ReturnType<typeof useTransactionMetadataRequest>);
    mockUseNetworkInfo.mockReturnValue({
      networkImage: 'https://example.com/network-image.png',
      networkNativeCurrency: 'ETH',
    } as unknown as ReturnType<typeof useNetworkInfo>);

    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={tokenAddress} />,
    );

    expect(getByTestId('token-icon')).toBeOnTheScreen();
  });

  it('renders the native token icon when tokenAddress is the native token address', () => {
    const tokenAddress = NATIVE_TOKEN_ADDRESS;
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
    } as unknown as ReturnType<typeof useTransactionMetadataRequest>);
    mockUseNetworkInfo.mockReturnValue({
      networkImage: 'https://example.com/network-image.png',
      networkNativeCurrency: 'ETH',
    } as unknown as ReturnType<typeof useNetworkInfo>);

    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={tokenAddress} />,
    );

    expect(getByTestId('native-icon')).toBeOnTheScreen();
  });
});
