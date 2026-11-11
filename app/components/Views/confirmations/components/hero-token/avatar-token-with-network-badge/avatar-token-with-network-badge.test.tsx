import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useTokenAsset } from '../../../hooks/useTokenAsset';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { AvatarTokenWithNetworkBadge } from './avatar-token-with-network-badge';

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/useTokenAsset');
jest.mock('../../../hooks/useNetworkInfo');

describe('AvatarTokenWithNetworkBadge', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseTokenAsset = jest.mocked(useTokenAsset);
  const mockUseNetworkInfo = jest.mocked(useNetworkInfo);

  beforeEach(() => {
    jest.resetAllMocks();

    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
    } as never);
    mockUseTokenAsset.mockReturnValue({
      asset: {
        image: 'https://example.com/token.png',
        isNative: false,
      },
      displayName: 'USDC',
    } as ReturnType<typeof useTokenAsset>);
    mockUseNetworkInfo.mockReturnValue({
      networkName: 'Ethereum',
      networkImage: { uri: 'https://example.com/eth.png' },
      networkNativeCurrency: 'ETH',
    });
  });

  it('renders network badge when network image is provided', () => {
    const { getByTestId } = renderWithProvider(
      <AvatarTokenWithNetworkBadge />,
      { state: initialRootState },
    );

    expect(getByTestId('badgenetwork')).toBeOnTheScreen();
  });

  it('hides network badge when network image is missing', () => {
    mockUseNetworkInfo.mockReturnValue({});

    const { queryByTestId } = renderWithProvider(
      <AvatarTokenWithNetworkBadge />,
      { state: initialRootState },
    );

    expect(queryByTestId('badgenetwork')).not.toBeOnTheScreen();
  });
});
