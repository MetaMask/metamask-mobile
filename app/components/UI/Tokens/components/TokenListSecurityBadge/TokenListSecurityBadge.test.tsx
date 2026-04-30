import React from 'react';
import { render } from '@testing-library/react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';

import { strings } from '../../../../../../locales/i18n';

import TokenListSecurityBadge from './TokenListSecurityBadge';
import { useTokenListSecurityBadgeQuery } from '../../hooks/useTokenListSecurityBadgeQuery';

jest.mock('../../hooks/useTokenListSecurityBadgeQuery', () => ({
  useTokenListSecurityBadgeQuery: jest.fn(),
}));

const mockUseTokenListSecurityBadgeQuery = jest.mocked(
  useTokenListSecurityBadgeQuery,
);

const SAMPLE_CAIP =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

function mockQueryResult(
  partial: Partial<UseQueryResult<TokenSecurityData | null, Error>> & {
    data?: TokenSecurityData | null | undefined;
    isLoading?: boolean;
    isError?: boolean;
  },
): UseQueryResult<TokenSecurityData | null, Error> {
  return {
    data: undefined,
    dataUpdatedAt: 0,
    error: null,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPlaceholderData: false,
    isPreviousData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: true,
    refetch: jest.fn(),
    remove: jest.fn(),
    status: 'success',
    fetchStatus: 'idle',
    ...partial,
  } as UseQueryResult<TokenSecurityData | null, Error>;
}

describe('TokenListSecurityBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a loading indicator when the query is loading without data or error', () => {
    mockUseTokenListSecurityBadgeQuery.mockReturnValue(
      mockQueryResult({
        data: undefined,
        isLoading: true,
        isError: false,
        isFetching: true,
        isSuccess: false,
        status: 'loading',
      }),
    );

    const { getByLabelText } = render(
      <TokenListSecurityBadge caipAssetId={SAMPLE_CAIP} />,
    );

    expect(getByLabelText('Token security loading')).toBeOnTheScreen();
  });

  it('passes caipAssetId to the security badge query hook', () => {
    mockUseTokenListSecurityBadgeQuery.mockReturnValue(
      mockQueryResult({
        data: { resultType: 'Benign' } as TokenSecurityData,
      }),
    );

    render(<TokenListSecurityBadge caipAssetId={SAMPLE_CAIP} />);

    expect(mockUseTokenListSecurityBadgeQuery).toHaveBeenCalledWith(
      SAMPLE_CAIP,
    );
  });

  it('renders nothing when the API payload maps to no inline badge', () => {
    mockUseTokenListSecurityBadgeQuery.mockReturnValue(
      mockQueryResult({
        data: { resultType: 'Benign' } as TokenSecurityData,
      }),
    );

    const { toJSON } = render(
      <TokenListSecurityBadge caipAssetId={SAMPLE_CAIP} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders nothing when resultType is unknown', () => {
    mockUseTokenListSecurityBadgeQuery.mockReturnValue(
      mockQueryResult({
        data: { resultType: 'UnknownType' } as TokenSecurityData,
      }),
    );

    const { toJSON } = render(
      <TokenListSecurityBadge caipAssetId={SAMPLE_CAIP} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders an icon-only badge for Verified tokens', () => {
    mockUseTokenListSecurityBadgeQuery.mockReturnValue(
      mockQueryResult({
        data: { resultType: 'Verified' } as TokenSecurityData,
      }),
    );

    const { getByTestId } = render(
      <TokenListSecurityBadge caipAssetId={SAMPLE_CAIP} />,
    );

    expect(getByTestId('token-list-security-badge-icon')).toBeOnTheScreen();
  });

  it('renders a labelled badge for Warning resultType', () => {
    mockUseTokenListSecurityBadgeQuery.mockReturnValue(
      mockQueryResult({
        data: { resultType: 'Warning' } as TokenSecurityData,
      }),
    );

    const { getByText } = render(
      <TokenListSecurityBadge caipAssetId={SAMPLE_CAIP} />,
    );

    expect(getByText(strings('security_trust.risky'))).toBeOnTheScreen();
  });

  it('renders a labelled badge for Malicious resultType', () => {
    mockUseTokenListSecurityBadgeQuery.mockReturnValue(
      mockQueryResult({
        data: { resultType: 'Malicious' } as TokenSecurityData,
      }),
    );

    const { getByText } = render(
      <TokenListSecurityBadge caipAssetId={SAMPLE_CAIP} />,
    );

    expect(getByText(strings('security_trust.malicious'))).toBeOnTheScreen();
  });

  it('does not show the loading state when the query ends in error', () => {
    mockUseTokenListSecurityBadgeQuery.mockReturnValue(
      mockQueryResult({
        data: undefined,
        error: new Error('network'),
        isError: true,
        isLoading: false,
        isSuccess: false,
        status: 'error',
      }),
    );

    const { queryByLabelText, toJSON } = render(
      <TokenListSecurityBadge caipAssetId={SAMPLE_CAIP} />,
    );

    expect(queryByLabelText('Token security loading')).not.toBeOnTheScreen();
    expect(toJSON()).toBeNull();
  });
});
