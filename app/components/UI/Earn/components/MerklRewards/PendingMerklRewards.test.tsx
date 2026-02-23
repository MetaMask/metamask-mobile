import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import PendingMerklRewards from './PendingMerklRewards';

const mockOpenTooltipModal = jest.fn();
jest.mock('../../../../hooks/useTooltipModal', () => ({
  __esModule: true,
  default: () => ({
    openTooltipModal: mockOpenTooltipModal,
  }),
}));

jest.mock('../../../../../core/AppConstants', () => ({
  URLS: {
    MUSD_CONVERSION_BONUS_TERMS_OF_USE:
      'https://metamask.io/musd-bonus-terms-of-use',
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, values?: Record<string, string>) => {
    const mockStrings: Record<string, string> = {
      'asset_overview.merkl_rewards.claimable_bonus': 'Claimable bonus',
      'asset_overview.merkl_rewards.claimable_bonus_tooltip_description':
        'mUSD bonuses are claimed on Linea.',
      'asset_overview.merkl_rewards.terms_apply': 'Terms apply.',
      'asset_overview.merkl_rewards.ok': 'OK',
      'asset_overview.merkl_rewards.annual_bonus': '{{apy}}% bonus',
    };
    let template = mockStrings[key] || key;
    if (values && template) {
      // Replace placeholders like {{apy}} with actual values
      Object.entries(values).forEach(([placeholder, value]) => {
        template = template.replace(
          new RegExp(`{{${placeholder}}}`, 'g'),
          value,
        );
      });
    }
    return template;
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
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
    ButtonIcon: ({
      testID,
      onPress,
      iconName,
      ...props
    }: {
      testID?: string;
      onPress?: () => void;
      iconName?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        { testID, onPress, ...props },
        ReactActual.createElement(View, { testID: `icon-${iconName}` }),
      ),
    BoxAlignItems: {
      Center: 'center',
    },
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxJustifyContent: {
      Between: 'space-between',
      Center: 'center',
    },
    IconName: {
      MoneyBag: 'MoneyBag',
      Calendar: 'Calendar',
      ArrowRight: 'ArrowRight',
      Info: 'Info',
    },
    IconSize: {
      Md: 'md',
      Sm: 'sm',
    },
    IconColor: {
      IconAlternative: 'alternative',
    },
    ButtonIconSize: {
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

describe('PendingMerklRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when claimableReward is null', () => {
    const { queryByText } = render(
      <PendingMerklRewards claimableReward={null} />,
    );

    // Component should not render anything when claimableReward is null
    // Verify no text content is rendered
    expect(queryByText('Claimable bonus')).toBeNull();
    expect(queryByText('3% bonus')).toBeNull();
  });

  it('renders claimable bonus section when claimableReward is provided', () => {
    const { getByText } = render(
      <PendingMerklRewards claimableReward="10.01" />,
    );

    expect(getByText('Claimable bonus')).toBeTruthy();
    expect(getByText('3% bonus')).toBeTruthy();
    expect(getByText('$10.01')).toBeTruthy();
  });

  it('renders money bag icon in claimable bonus section', () => {
    const { getByTestId } = render(
      <PendingMerklRewards claimableReward="10.01" />,
    );

    expect(getByTestId('icon-MoneyBag')).toBeTruthy();
  });

  it('renders info button next to claimable bonus text', () => {
    const { getByTestId } = render(
      <PendingMerklRewards claimableReward="10.01" />,
    );

    expect(getByTestId('claimable-bonus-info-button')).toBeTruthy();
    expect(getByTestId('icon-Info')).toBeTruthy();
  });

  it('opens tooltip modal when info button is pressed', () => {
    const { getByTestId } = render(
      <PendingMerklRewards claimableReward="10.01" />,
    );

    fireEvent.press(getByTestId('claimable-bonus-info-button'));

    expect(mockOpenTooltipModal).toHaveBeenCalledTimes(1);
    expect(mockOpenTooltipModal).toHaveBeenCalledWith(
      'Claimable bonus',
      expect.any(Object), // React element with tooltip content
      undefined,
      'OK',
    );
  });

  it('opens terms URL when terms link is pressed in tooltip', () => {
    const linkingSpy = jest.spyOn(Linking, 'openURL');

    const { getByTestId } = render(
      <PendingMerklRewards claimableReward="10.01" />,
    );

    fireEvent.press(getByTestId('claimable-bonus-info-button'));

    // Get the tooltip content (second argument to openTooltipModal)
    const tooltipContent = mockOpenTooltipModal.mock.calls[0][1];

    // Render the tooltip content to access the terms link
    const { getByText } = render(tooltipContent);
    fireEvent.press(getByText('Terms apply.'));

    expect(linkingSpy).toHaveBeenCalledWith(
      'https://metamask.io/musd-bonus-terms-of-use',
    );
  });
});
