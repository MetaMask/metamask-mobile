import React from 'react';
import BigNumber from 'bignumber.js';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';
import {
  MusdMaxConversionAssetHeader,
  MusdMaxConversionAssetHeaderSkeleton,
  MusdMaxConversionAssetHeaderTestIds,
} from './musd-max-conversion-asset-header';
import { AssetType } from '../../../types/token';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { useStyles } from '../../../../../hooks/useStyles';

jest.mock('../../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(),
}));

jest.mock('../../../hooks/pay/useTransactionPayData', () => ({
  useIsTransactionPayLoading: jest.fn(),
}));

jest.mock('../../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-image' })),
}));

const mockUseStyles = jest.mocked(useStyles);
const mockUseIsTransactionPayLoading = jest.mocked(useIsTransactionPayLoading);

const mockStyles = {
  container: {},
  assetInfo: {},
  assetInfoSkeleton: {},
  assetAmount: {},
  skeletonBorderRadius: {},
  skeletonAvatar: {},
};

function createMockToken(overrides: Partial<AssetType> = {}): AssetType {
  return {
    symbol: 'MUSD',
    image: 'https://example.com/musd.png',
    chainId: '0xe708',
    address: '0x123',
    name: 'MetaMask USD',
    decimals: 6,
    balance: '0',
    logo: undefined,
    isETH: undefined,
    ...overrides,
  };
}

function createMockFormatFiat() {
  return jest.fn((value: BigNumber) => `$${value.toFixed(2)}`);
}

describe('MusdMaxConversionAssetHeaderSkeleton', () => {
  beforeEach(() => {
    mockUseStyles.mockReturnValue({
      styles: mockStyles,
      theme: {},
    } as ReturnType<typeof useStyles>);
  });

  it('renders skeleton container with ASSET_HEADER_SKELETON testID', () => {
    const { getByTestId } = renderWithProvider(
      <MusdMaxConversionAssetHeaderSkeleton />,
      { state: initialRootState },
    );

    const skeleton = getByTestId(
      MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_SKELETON,
    );

    expect(skeleton).toBeOnTheScreen();
  });
});

describe('MusdMaxConversionAssetHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStyles.mockReturnValue({
      styles: mockStyles,
      theme: {},
    } as ReturnType<typeof useStyles>);
    mockUseIsTransactionPayLoading.mockReturnValue(false);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders skeleton when loading', () => {
    mockUseIsTransactionPayLoading.mockReturnValue(true);

    const token = createMockToken();
    const formatFiat = createMockFormatFiat();

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MusdMaxConversionAssetHeader
        token={token}
        networkName="Linea Mainnet"
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(
      getByTestId(MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_SKELETON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_INPUT),
    ).toBeNull();
    expect(
      queryByTestId(MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_OUTPUT),
    ).toBeNull();
  });

  it('renders asset header with token symbol and formatted fiat when not loading', () => {
    const token = createMockToken({ fiat: { balance: 1234.56 } });
    const formatFiat = createMockFormatFiat();
    formatFiat.mockReturnValue('$1,234.56');

    const { getByTestId, getByText, getAllByText } = renderWithProvider(
      <MusdMaxConversionAssetHeader
        token={token}
        networkName="Linea Mainnet"
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(
      getByTestId(MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_OUTPUT),
    ).toBeOnTheScreen();
    expect(getByText('MUSD')).toBeOnTheScreen();
    expect(getAllByText('$1,234.56')).toHaveLength(2);
    expect(formatFiat).toHaveBeenCalledWith(new BigNumber(1234.56));
  });

  it('renders empty fiat text when token has no fiat balance', () => {
    const token = createMockToken({ fiat: undefined });
    const formatFiat = createMockFormatFiat();

    const { getByTestId, getByText } = renderWithProvider(
      <MusdMaxConversionAssetHeader
        token={token}
        networkName="Linea Mainnet"
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(
      getByTestId(MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_OUTPUT),
    ).toBeOnTheScreen();
    expect(getByText('MUSD')).toBeOnTheScreen();
    expect(formatFiat).not.toHaveBeenCalled();
  });

  it('renders empty fiat text when token fiat balance is zero', () => {
    const token = createMockToken({ fiat: { balance: 0 } });
    const formatFiat = createMockFormatFiat();

    const { getByTestId } = renderWithProvider(
      <MusdMaxConversionAssetHeader
        token={token}
        networkName="Linea Mainnet"
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(
      getByTestId(MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MusdMaxConversionAssetHeaderTestIds.ASSET_HEADER_OUTPUT),
    ).toBeOnTheScreen();
    expect(formatFiat).not.toHaveBeenCalled();
  });

  it('renders token avatar with symbol-based testID', () => {
    const token = createMockToken({ symbol: 'USDC' });
    const formatFiat = createMockFormatFiat();

    const { getByTestId } = renderWithProvider(
      <MusdMaxConversionAssetHeader
        token={token}
        networkName="Ethereum"
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(getByTestId('earn-token-avatar-USDC')).toBeOnTheScreen();
  });

  it('calls getNetworkImageSource with token chainId', () => {
    const mockGetNetworkImageSource = jest.mocked(getNetworkImageSource);
    const token = createMockToken({ chainId: '0x1' });
    const formatFiat = createMockFormatFiat();

    renderWithProvider(
      <MusdMaxConversionAssetHeader
        token={token}
        networkName="Ethereum"
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(mockGetNetworkImageSource).toHaveBeenCalledWith({ chainId: '0x1' });
  });

  it('calls getNetworkImageSource with empty string when token chainId is missing', () => {
    const mockGetNetworkImageSource = jest.mocked(getNetworkImageSource);
    const token = createMockToken({ chainId: undefined });
    const formatFiat = createMockFormatFiat();

    renderWithProvider(
      <MusdMaxConversionAssetHeader
        token={token}
        networkName="Unknown"
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(mockGetNetworkImageSource).toHaveBeenCalledWith({ chainId: '' });
  });
});
