import React from 'react';
import { render } from '@testing-library/react-native';
import PendingMerklRewards from './PendingMerklRewards';
import { TokenI } from '../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const mockStrings: Record<string, string> = {
      'asset_overview.merkl_rewards.claimable_bonus': 'Claimable bonus',
      'asset_overview.merkl_rewards.annual_bonus': 'Annual bonus',
    };
    return mockStrings[key] || key;
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => ReactActual.createElement(View, { testID, ...props }, children),
    Text: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => ReactActual.createElement(Text, props, children),
    Icon: ({ name, ...props }: { name: string; [key: string]: unknown }) =>
      ReactActual.createElement(View, { testID: `icon-${name}`, ...props }),
    BoxAlignItems: {
      Center: 'center',
    },
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxJustifyContent: {
      Between: 'space-between',
    },
    IconName: {
      MoneyBag: 'MoneyBag',
      Calendar: 'Calendar',
      ArrowRight: 'ArrowRight',
    },
    IconSize: {
      Md: 'md',
      Sm: 'sm',
    },
    TextVariant: {
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
    FontWeight: {
      Medium: 'medium',
    },
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((styles: string) => ({ testID: `tw-${styles}` })),
  }),
}));

const mockAsset: TokenI = {
  name: 'Angle Merkl',
  symbol: 'aglaMerkl',
  address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898' as const,
  chainId: CHAIN_IDS.MAINNET,
  decimals: 18,
  aggregators: [],
  image: '',
  balance: '1000',
  balanceFiat: '$100',
  logo: '',
  isETH: false,
  isNative: false,
};

describe('PendingMerklRewards', () => {
  it('renders component with divider when claimableReward is null', () => {
    const { UNSAFE_root } = render(
      <PendingMerklRewards asset={mockAsset} claimableReward={null} />,
    );

    // Component should render successfully (divider is always present)
    expect(UNSAFE_root).toBeTruthy();
  });

  it('does not render claimable bonus section when claimableReward is null', () => {
    const { queryByText } = render(
      <PendingMerklRewards asset={mockAsset} claimableReward={null} />,
    );

    expect(queryByText('Claimable bonus')).toBeNull();
  });

  it('renders claimable bonus section when claimableReward is provided', () => {
    const { getByText } = render(
      <PendingMerklRewards asset={mockAsset} claimableReward="1.5" />,
    );

    expect(getByText('Claimable bonus')).toBeTruthy();
    expect(getByText('1.5 aglaMerkl')).toBeTruthy();
  });

  it('renders money bag icon in claimable bonus section', () => {
    const { getByTestId } = render(
      <PendingMerklRewards asset={mockAsset} claimableReward="1.5" />,
    );

    expect(getByTestId('icon-MoneyBag')).toBeTruthy();
  });

  it('displays correct asset symbol in claimable reward amount', () => {
    const customAsset = {
      ...mockAsset,
      symbol: 'mUSD',
    };

    const { getByText } = render(
      <PendingMerklRewards asset={customAsset} claimableReward="2.5" />,
    );

    expect(getByText('2.5 mUSD')).toBeTruthy();
  });
});
