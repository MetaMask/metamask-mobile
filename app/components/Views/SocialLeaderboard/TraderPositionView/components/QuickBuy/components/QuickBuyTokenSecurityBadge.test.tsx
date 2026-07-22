import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, waitFor } from '@testing-library/react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';

import { strings } from '../../../../../../../../locales/i18n';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import QuickBuyTokenSecurityBadge from './QuickBuyTokenSecurityBadge';
import { requestTokenSecurityForAsset } from '../../../../../../UI/Tokens/util/tokenSecurityBadgeBatch';
import { getCaipAssetIdForBridgeToken } from '../utils/getCaipAssetIdForBridgeToken';

const mockIsStockToken = jest.fn().mockReturnValue(false);

jest.mock('../../../../../../UI/Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isStockToken: mockIsStockToken,
  }),
}));

jest.mock('../utils/getCaipAssetIdForBridgeToken', () => ({
  getCaipAssetIdForBridgeToken: jest.fn(),
  isBridgeTokenNative: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../../../../UI/Tokens/util/tokenSecurityBadgeBatch', () => ({
  requestTokenSecurityForAsset: jest.fn(),
}));

const mockGetCaipAssetIdForBridgeToken = jest.mocked(
  getCaipAssetIdForBridgeToken,
);
const mockRequestTokenSecurityForAsset = jest.mocked(
  requestTokenSecurityForAsset,
);

const SAMPLE_CAIP =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

const createToken = (overrides: Partial<BridgeToken> = {}): BridgeToken => ({
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  chainId: '0x1',
  ...overrides,
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

const renderBadge = (
  token: BridgeToken,
  queryClient: QueryClient,
  state: { settings: { basicFunctionalityEnabled: boolean } } = {
    settings: { basicFunctionalityEnabled: true },
  },
) =>
  renderWithProvider(
    <QueryClientProvider client={queryClient}>
      <QuickBuyTokenSecurityBadge
        token={token}
        iconTestID="quick-buy-token-security-badge-icon"
      />
    </QueryClientProvider>,
    { state },
  );

describe('QuickBuyTokenSecurityBadge', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsStockToken.mockReturnValue(false);
    mockGetCaipAssetIdForBridgeToken.mockResolvedValue(SAMPLE_CAIP);
    queryClient = createQueryClient();
  });

  afterEach(async () => {
    queryClient.clear();
    await queryClient.cancelQueries();
  });

  it('renders a verified badge from the isVerified fast-path while security data loads', async () => {
    let resolveSecurity: (value: TokenSecurityData) => void = () => undefined;
    mockRequestTokenSecurityForAsset.mockImplementation(
      () =>
        new Promise<TokenSecurityData>((resolve) => {
          resolveSecurity = resolve;
        }),
    );

    const { getByTestId } = renderBadge(
      createToken({ isVerified: true }),
      queryClient,
    );

    await waitFor(() => {
      expect(
        getByTestId('quick-buy-token-security-badge-icon'),
      ).toBeOnTheScreen();
    });

    await act(async () => {
      resolveSecurity({ resultType: 'Benign' } as TokenSecurityData);
    });
  });

  it('renders nothing while loading when isVerified is false', async () => {
    let resolveSecurity: (value: TokenSecurityData) => void = () => undefined;
    mockRequestTokenSecurityForAsset.mockImplementation(
      () =>
        new Promise<TokenSecurityData>((resolve) => {
          resolveSecurity = resolve;
        }),
    );

    const { queryByTestId, queryByLabelText } = renderBadge(
      createToken({ isVerified: false }),
      queryClient,
    );

    await waitFor(() => {
      expect(mockGetCaipAssetIdForBridgeToken).toHaveBeenCalled();
    });

    expect(queryByTestId('quick-buy-token-security-badge-icon')).toBeNull();
    expect(queryByLabelText('Token security loading')).toBeNull();

    await act(async () => {
      resolveSecurity({ resultType: 'Benign' } as TokenSecurityData);
    });
  });

  it('renders an icon-only badge when the API returns Verified', async () => {
    mockRequestTokenSecurityForAsset.mockResolvedValue({
      resultType: 'Verified',
    } as TokenSecurityData);

    const { getByTestId } = renderBadge(createToken(), queryClient);

    await waitFor(() => {
      expect(
        getByTestId('quick-buy-token-security-badge-icon'),
      ).toBeOnTheScreen();
    });
  });

  it('renders a labelled badge when the API returns Warning', async () => {
    mockRequestTokenSecurityForAsset.mockResolvedValue({
      resultType: 'Warning',
    } as TokenSecurityData);

    const { getByText } = renderBadge(createToken(), queryClient);

    await waitFor(() => {
      expect(getByText(strings('security_trust.risky'))).toBeOnTheScreen();
    });
  });

  it('falls back to the verified badge when the API errors and isVerified is true', async () => {
    mockRequestTokenSecurityForAsset.mockRejectedValue(new Error('network'));

    const { getByTestId } = renderBadge(
      createToken({ isVerified: true }),
      queryClient,
    );

    await waitFor(() => {
      expect(
        getByTestId('quick-buy-token-security-badge-icon'),
      ).toBeOnTheScreen();
    });
  });

  it('replaces the isVerified fast-path when the API returns Warning', async () => {
    mockRequestTokenSecurityForAsset.mockResolvedValue({
      resultType: 'Warning',
    } as TokenSecurityData);

    const { getByText, queryByTestId } = renderBadge(
      createToken({ isVerified: true }),
      queryClient,
    );

    await waitFor(() => {
      expect(getByText(strings('security_trust.risky'))).toBeOnTheScreen();
    });
    expect(queryByTestId('quick-buy-token-security-badge-icon')).toBeNull();
  });

  it('renders nothing when basicFunctionalityEnabled is false', () => {
    const { toJSON } = renderBadge(
      createToken({ isVerified: true }),
      queryClient,
      {
        settings: { basicFunctionalityEnabled: false },
      },
    );

    expect(toJSON()).toBeNull();
    expect(mockGetCaipAssetIdForBridgeToken).not.toHaveBeenCalled();
  });

  it('renders nothing for stock tokens', () => {
    mockIsStockToken.mockReturnValue(true);

    const { toJSON } = renderBadge(
      createToken({ isVerified: true }),
      queryClient,
    );

    expect(toJSON()).toBeNull();
    expect(mockGetCaipAssetIdForBridgeToken).not.toHaveBeenCalled();
  });
});
