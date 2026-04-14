import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoPendingSheet, {
  ONDO_PENDING_SHEET_TEST_IDS,
} from './OndoPendingSheet';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    ...actual,
    BottomSheet: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      goBack?: () => void;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    BottomSheetHeader: ({
      children,
      onClose,
    }: {
      children?: React.ReactNode;
      onClose?: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'bottom-sheet-header' },
        children,
        ReactActual.createElement(Pressable, {
          testID: 'sheet-header-close',
          onPress: onClose,
        }),
      ),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}(${JSON.stringify(params)})`;
    return key;
  },
}));

jest.mock('./CampaignStatsSummary', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    StatCell: ({
      label,
      testID,
    }: {
      label: string;
      value: string;
      testID?: string;
      suffix?: React.ReactNode;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, label),
      ),
    PendingTag: () => ReactActual.createElement(View, null),
  };
});

jest.mock('./OndoLeaderboard.utils', () => ({
  formatTierDisplayName: (tier: string) => tier.toLowerCase(),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatUsd: (value: number) => `$${value.toFixed(2)}`,
}));

describe('OndoPendingSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('own variant', () => {
    const ownProps = {
      route: {
        params: {
          variant: 'own' as const,
          tier: 'STARTER',
          netDeposit: 1000,
          qualifiedDays: 3,
          tierMinDeposit: 500,
        },
      },
    };

    it('renders with container testID', () => {
      const { getByTestId } = render(<OndoPendingSheet {...ownProps} />);
      expect(getByTestId(ONDO_PENDING_SHEET_TEST_IDS.CONTAINER)).toBeDefined();
    });

    it('renders tier and net deposit stat cells', () => {
      const { getByTestId } = render(<OndoPendingSheet {...ownProps} />);
      expect(getByTestId(ONDO_PENDING_SHEET_TEST_IDS.TIER_CELL)).toBeDefined();
      expect(
        getByTestId(ONDO_PENDING_SHEET_TEST_IDS.NET_DEPOSIT_CELL),
      ).toBeDefined();
    });

    it('renders body text with pending explanation', () => {
      const { getByTestId } = render(<OndoPendingSheet {...ownProps} />);
      expect(getByTestId(ONDO_PENDING_SHEET_TEST_IDS.BODY)).toBeDefined();
    });

    it('renders CTA button', () => {
      const { getByTestId } = render(<OndoPendingSheet {...ownProps} />);
      expect(getByTestId(ONDO_PENDING_SHEET_TEST_IDS.CTA)).toBeDefined();
    });

    it('pressing CTA does not crash', () => {
      const { getByTestId } = render(<OndoPendingSheet {...ownProps} />);
      fireEvent.press(getByTestId(ONDO_PENDING_SHEET_TEST_IDS.CTA));
      expect(getByTestId(ONDO_PENDING_SHEET_TEST_IDS.CONTAINER)).toBeDefined();
    });
  });

  describe('other variant', () => {
    const otherProps = {
      route: { params: { variant: 'other' as const } },
    };

    it('renders with container testID', () => {
      const { getByTestId } = render(<OndoPendingSheet {...otherProps} />);
      expect(getByTestId(ONDO_PENDING_SHEET_TEST_IDS.CONTAINER)).toBeDefined();
    });

    it('renders body text for other variant', () => {
      const { getByTestId } = render(<OndoPendingSheet {...otherProps} />);
      expect(getByTestId(ONDO_PENDING_SHEET_TEST_IDS.BODY)).toBeDefined();
    });

    it('does not render tier/deposit cells', () => {
      const { queryByTestId } = render(<OndoPendingSheet {...otherProps} />);
      expect(queryByTestId(ONDO_PENDING_SHEET_TEST_IDS.TIER_CELL)).toBeNull();
      expect(
        queryByTestId(ONDO_PENDING_SHEET_TEST_IDS.NET_DEPOSIT_CELL),
      ).toBeNull();
    });

    it('renders CTA button', () => {
      const { getByTestId } = render(<OndoPendingSheet {...otherProps} />);
      expect(getByTestId(ONDO_PENDING_SHEET_TEST_IDS.CTA)).toBeDefined();
    });

    it('pressing sheet header close does not crash', () => {
      const { getByTestId } = render(<OndoPendingSheet {...otherProps} />);
      fireEvent.press(getByTestId('sheet-header-close'));
      expect(getByTestId(ONDO_PENDING_SHEET_TEST_IDS.CONTAINER)).toBeDefined();
    });
  });
});
