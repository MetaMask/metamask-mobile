import React from 'react';
import BigNumber from 'bignumber.js';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';
import {
  TokenConversionAssetHeader,
  TokenConversionAssetHeaderSkeleton,
  TokenConversionAssetHeaderTestIds,
} from './token-conversion-asset-header';
import { AssetType } from '../../types/token';
import {
  useIsTransactionPayLoading,
  useTransactionPayTotals,
} from '../../hooks/pay/useTransactionPayData';
import { getNetworkImageSource } from '../../../../../util/networks';
import { useStyles } from '../../../../hooks/useStyles';
import { useNetworkName } from '../../hooks/useNetworkName';

jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(),
}));

jest.mock('../../hooks/pay/useTransactionPayData', () => ({
  useIsTransactionPayLoading: jest.fn(),
  useTransactionPayTotals: jest.fn(),
}));

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-image' })),
}));

jest.mock('../../hooks/useNetworkName', () => ({
  useNetworkName: jest.fn(() => 'Ethereum'),
}));

const mockUseStyles = jest.mocked(useStyles);
const mockUseIsTransactionPayLoading = jest.mocked(useIsTransactionPayLoading);
const mockUseTransactionPayTotals = jest.mocked(useTransactionPayTotals);
const mockUseNetworkName = jest.mocked(useNetworkName);

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

describe('TokenConversionAssetHeaderSkeleton', () => {
  beforeEach(() => {
    mockUseStyles.mockReturnValue({
      styles: mockStyles,
      theme: {},
    } as ReturnType<typeof useStyles>);
  });

  it('renders skeleton container with ASSET_HEADER_SKELETON testID', () => {
    const { getByTestId } = renderWithProvider(
      <TokenConversionAssetHeaderSkeleton />,
      { state: initialRootState },
    );

    const skeleton = getByTestId(
      TokenConversionAssetHeaderTestIds.ASSET_HEADER_SKELETON,
    );

    expect(skeleton).toBeOnTheScreen();
  });
});

describe('TokenConversionAssetHeader', () => {
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
    mockUseNetworkName.mockReturnValue('Ethereum');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders skeleton alongside hidden content for measurement when loading', () => {
    mockUseIsTransactionPayLoading.mockReturnValue(true);

    const token = createMockToken();
    const formatFiat = createMockFormatFiat();

    const { getByTestId } = renderWithProvider(
      <TokenConversionAssetHeader
        inputToken={token}
        outputToken={token}
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(
      getByTestId(TokenConversionAssetHeaderTestIds.ASSET_HEADER_SKELETON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TokenConversionAssetHeaderTestIds.ASSET_HEADER_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TokenConversionAssetHeaderTestIds.ASSET_HEADER_OUTPUT),
    ).toBeOnTheScreen();
  });

  it('renders asset header with quote source and target totals when not loading', () => {
    const token = createMockToken();
    const formatFiat = createMockFormatFiat();
    formatFiat
      .mockReturnValueOnce('$1,234.56')
      .mockReturnValueOnce('$1,230.01');

    const { getByTestId, getAllByText } = renderWithProvider(
      <TokenConversionAssetHeader
        inputToken={token}
        outputToken={token}
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(
      getByTestId(TokenConversionAssetHeaderTestIds.ASSET_HEADER_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TokenConversionAssetHeaderTestIds.ASSET_HEADER_OUTPUT),
    ).toBeOnTheScreen();
    expect(getAllByText('MUSD')).toHaveLength(2);
    expect(getAllByText('$1,234.56')).toHaveLength(1);
    expect(getAllByText('$1,230.01')).toHaveLength(1);
    expect(formatFiat).toHaveBeenNthCalledWith(1, new BigNumber('1234.56'));
    expect(formatFiat).toHaveBeenNthCalledWith(2, new BigNumber('1230.01'));
  });

  it('renders empty fiat text when quote totals are missing', () => {
    mockUseTransactionPayTotals.mockReturnValue(undefined);

    const token = createMockToken();
    const formatFiat = createMockFormatFiat();

    const { getByTestId, getAllByText } = renderWithProvider(
      <TokenConversionAssetHeader
        inputToken={token}
        outputToken={token}
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(
      getByTestId(TokenConversionAssetHeaderTestIds.ASSET_HEADER_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TokenConversionAssetHeaderTestIds.ASSET_HEADER_OUTPUT),
    ).toBeOnTheScreen();
    expect(getAllByText('MUSD')).toHaveLength(2);
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
      <TokenConversionAssetHeader
        inputToken={token}
        outputToken={token}
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(
      getByTestId(TokenConversionAssetHeaderTestIds.ASSET_HEADER_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TokenConversionAssetHeaderTestIds.ASSET_HEADER_OUTPUT),
    ).toBeOnTheScreen();
    expect(formatFiat).toHaveBeenNthCalledWith(1, new BigNumber('0'));
    expect(formatFiat).toHaveBeenNthCalledWith(2, new BigNumber('0'));
  });

  it('renders input and output token avatars', () => {
    const inputToken = createMockToken({ symbol: 'USDC' });
    const outputToken = createMockToken({ symbol: 'MUSD' });
    const formatFiat = createMockFormatFiat();

    const { getByTestId } = renderWithProvider(
      <TokenConversionAssetHeader
        inputToken={inputToken}
        outputToken={outputToken}
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(
      getByTestId(TokenConversionAssetHeaderTestIds.INPUT_TOKEN_AVATAR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TokenConversionAssetHeaderTestIds.OUTPUT_TOKEN_AVATAR),
    ).toBeOnTheScreen();
  });

  it('calls getNetworkImageSource with input and output token chainIds', () => {
    const mockGetNetworkImageSource = jest.mocked(getNetworkImageSource);
    const inputToken = createMockToken({ chainId: '0x1' });
    const outputToken = createMockToken({ chainId: '0xe708' });
    const formatFiat = createMockFormatFiat();

    renderWithProvider(
      <TokenConversionAssetHeader
        inputToken={inputToken}
        outputToken={outputToken}
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(mockGetNetworkImageSource).toHaveBeenNthCalledWith(1, {
      chainId: '0x1',
    });
    expect(mockGetNetworkImageSource).toHaveBeenNthCalledWith(2, {
      chainId: '0xe708',
    });
  });

  it('calls getNetworkImageSource with empty string when token chainIds are missing', () => {
    const mockGetNetworkImageSource = jest.mocked(getNetworkImageSource);
    const token = createMockToken({ chainId: undefined });
    const formatFiat = createMockFormatFiat();

    renderWithProvider(
      <TokenConversionAssetHeader
        inputToken={token}
        outputToken={token}
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(mockGetNetworkImageSource).toHaveBeenNthCalledWith(1, {
      chainId: '',
    });
    expect(mockGetNetworkImageSource).toHaveBeenNthCalledWith(2, {
      chainId: '',
    });
  });

  it('resolves network names from input and output token chainIds', () => {
    const inputToken = createMockToken({ chainId: '0x1' });
    const outputToken = createMockToken({ chainId: '0xe708' });
    const formatFiat = createMockFormatFiat();

    renderWithProvider(
      <TokenConversionAssetHeader
        inputToken={inputToken}
        outputToken={outputToken}
        formatFiat={formatFiat}
      />,
      { state: initialRootState },
    );

    expect(mockUseNetworkName).toHaveBeenNthCalledWith(1, '0x1');
    expect(mockUseNetworkName).toHaveBeenNthCalledWith(2, '0xe708');
  });
});
