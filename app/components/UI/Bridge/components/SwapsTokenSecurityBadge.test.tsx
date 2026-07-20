import React from 'react';
import { render } from '@testing-library/react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';

import SwapsTokenSecurityBadge from './SwapsTokenSecurityBadge';
import { useTokenListSecurityBadgeQuery } from '../../Tokens/hooks/useTokenListSecurityBadgeQuery';

jest.mock('../../Tokens/hooks/useTokenListSecurityBadgeQuery', () => ({
  useTokenListSecurityBadgeQuery: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return {
    Icon: ({
      testID,
      name,
      size,
    }: {
      testID?: string;
      name: string;
      size: string;
    }) => createElement(Text, { testID, size }, name),
    IconColor: { PrimaryDefault: 'PrimaryDefault' },
    IconName: { VerifiedFilled: 'VerifiedFilled' },
    IconSize: { Md: 'Md' },
    TextColor: { SuccessDefault: 'SuccessDefault' },
    IconAlertSeverity: { Success: 'Success' },
  };
});

const mockUseTokenListSecurityBadgeQuery = jest.mocked(
  useTokenListSecurityBadgeQuery,
);

const SAMPLE_CAIP =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

function mockQueryResult(data?: TokenSecurityData | null) {
  mockUseTokenListSecurityBadgeQuery.mockReturnValue({
    data,
  } as ReturnType<typeof useTokenListSecurityBadgeQuery>);
}

describe('SwapsTokenSecurityBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes caipAssetId to the token security query hook', () => {
    mockQueryResult({ resultType: 'Benign' } as TokenSecurityData);

    render(<SwapsTokenSecurityBadge caipAssetId={SAMPLE_CAIP} />);

    expect(mockUseTokenListSecurityBadgeQuery).toHaveBeenCalledWith(
      SAMPLE_CAIP,
    );
  });

  it('renders the verified icon when token security data is verified', () => {
    mockQueryResult({ resultType: 'Verified' } as TokenSecurityData);

    const { getByTestId } = render(
      <SwapsTokenSecurityBadge caipAssetId={SAMPLE_CAIP} />,
    );

    const icon = getByTestId('swaps-token-verified-icon');
    expect(icon).toBeOnTheScreen();
    expect(icon.props.size).toBe('Md');
  });

  it.each(['Benign', 'Warning', 'Spam', 'Malicious', undefined])(
    'renders nothing for %s token security data',
    (resultType) => {
      mockQueryResult(
        resultType ? ({ resultType } as TokenSecurityData) : undefined,
      );

      const { toJSON } = render(
        <SwapsTokenSecurityBadge caipAssetId={SAMPLE_CAIP} />,
      );

      expect(toJSON()).toBeNull();
    },
  );
});
