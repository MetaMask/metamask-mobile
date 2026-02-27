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
import {
  useIsTransactionPayLoading,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { useStyles } from '../../../../../hooks/useStyles';

jest.mock('../../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(),
}));

jest.mock('../../../hooks/pay/useTransactionPayData', () => ({
  useIsTransactionPayLoading: jest.fn(),
  useTransactionPayTotals: jest.fn(),
}));

jest.mock('../../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-image' })),
}));

const mockUseStyles = jest.mocked(useStyles);
const mockUseIsTransactionPayLoading = jest.mocked(useIsTransactionPayLoading);
const mockUseTransactionPayTotals = jest.mocked(useTransactionPayTotals);

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
    mockUseTransactionPayTotals.mockReturnValue({
      sourceAmount: { usd: '1234.56', fiat: '1234.56' },
      targetAmount: { usd: '1230.01', fiat: '1230.01' },
    } as ReturnType<typeof useTransactionPayTotals>);
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

  it('renders asset header with quote source and target totals when not loading', () => {
    const token = createMockToken();
    const formatFiat = createMockFormatFiat();
    formatFiat
      .mockReturnValueOnce('$1,234.56')
      .mockReturnValueOnce('$1,230.01');

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
    expect(getAllByText('$1,234.56')).toHaveLength(1);
    expect(getAllByText('$1,230.01')).toHaveLength(1);
    expect(formatFiat).toHaveBeenNthCalledWith(1, new BigNumber('1234.56'));
    expect(formatFiat).toHaveBeenNthCalledWith(2, new BigNumber('1230.01'));
  });

  it('renders empty fiat text when quote totals are missing', () => {
    mockUseTransactionPayTotals.mockReturnValue(undefined);

    const token = createMockToken();
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

  it('formats zero quote totals when source and target usd are zero', () => {
    mockUseTransactionPayTotals.mockReturnValue({
      sourceAmount: { usd: '0', fiat: '0' },
      targetAmount: { usd: '0', fiat: '0' },
    } as ReturnType<typeof useTransactionPayTotals>);

    const token = createMockToken();
    const formatFiat = createMockFormatFiat();
    formatFiat.mockReturnValue('$0.00');

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
    expect(formatFiat).toHaveBeenNthCalledWith(1, new BigNumber('0'));
    expect(formatFiat).toHaveBeenNthCalledWith(2, new BigNumber('0'));
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
