import React from 'react';
import { render } from '@testing-library/react-native';
import { useABTest } from '../../../../hooks';
import { TokenButton } from './TokenButton';

jest.mock('../../../../hooks', () => ({
  useABTest: jest.fn(),
}));

jest.mock('../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      icon: {},
      pillContainer: {},
      tokenSymbol: {},
      tokenSymbolRow: {},
    },
  })),
}));

jest.mock('../../../../component-library/components/Texts/Text', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      createElement(Text, null, children),
    TextVariant: { HeadingLG: 'HeadingLG' },
  };
});

jest.mock(
  '../../../../component-library/components/Badges/BadgeWrapper',
  () => {
    const { createElement, Fragment } = jest.requireActual('react');

    return {
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) =>
        createElement(Fragment, null, children),
      BadgePosition: { BottomRight: 'BottomRight' },
    };
  },
);

jest.mock('../../../../component-library/components/Badges/Badge', () => ({
  __esModule: true,
  default: () => null,
  BadgeVariant: { Network: 'Network' },
}));

jest.mock('../../../Base/TokenIcon', () => ({
  __esModule: true,
  default: ({ symbol }: { symbol?: string }) => {
    const { createElement } = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return createElement(Text, { testID: `token-icon-${symbol}` }, symbol);
  },
}));

jest.mock('./SwapsTokenSecurityBadge', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({ caipAssetId }: { caipAssetId: string }) =>
      createElement(
        Text,
        { testID: 'swaps-token-security-badge' },
        caipAssetId,
      ),
  };
});

jest.mock('@metamask/utils', () => {
  const actual = jest.requireActual('@metamask/utils');
  return actual;
});

jest.mock('@metamask/design-system-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return {
    Icon: ({ testID, name }: { testID?: string; name: string }) =>
      createElement(Text, { testID }, name),
    IconColor: { PrimaryDefault: 'PrimaryDefault' },
    IconName: { VerifiedFilled: 'VerifiedFilled' },
    IconSize: { Sm: 'Sm' },
  };
});

const mockUseABTest = jest.mocked(useABTest);

describe('TokenButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides security badge in control variant', () => {
    mockUseABTest.mockReturnValue({
      variant: { showVerifiedBadge: false },
      variantName: 'control',
      isActive: true,
    });

    const { queryByTestId } = render(
      <TokenButton
        symbol="ETH"
        iconUrl="https://example.com/eth"
        securityBadgeAssetId="eip155:1/slip44:60"
      />,
    );

    expect(queryByTestId('swaps-token-security-badge')).toBeNull();
  });

  it('shows security badge in treatment variant when asset id is available', () => {
    mockUseABTest.mockReturnValue({
      variant: { showVerifiedBadge: true },
      variantName: 'treatment',
      isActive: true,
    });

    const { getByTestId } = render(
      <TokenButton
        symbol="ETH"
        iconUrl="https://example.com/eth"
        securityBadgeAssetId="eip155:1/slip44:60"
      />,
    );

    expect(getByTestId('swaps-token-security-badge')).toBeOnTheScreen();
  });

  it('hides security badge in treatment variant when asset id is unavailable', () => {
    mockUseABTest.mockReturnValue({
      variant: { showVerifiedBadge: true },
      variantName: 'treatment',
      isActive: true,
    });

    const { queryByTestId } = render(
      <TokenButton symbol="ETH" iconUrl="https://example.com/eth" />,
    );

    expect(queryByTestId('swaps-token-security-badge')).toBeNull();
  });
});
