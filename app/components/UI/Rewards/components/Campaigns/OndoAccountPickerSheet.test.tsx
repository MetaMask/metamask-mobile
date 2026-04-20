import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import OndoAccountPickerSheet from './OndoAccountPickerSheet';
import type { AccountPickerConfig } from './OndoPortfolio';
import type { BottomSheetRef } from '@metamask/design-system-react-native';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    ...actual,
    BottomSheet: ({
      children,
      onClose,
    }: {
      children?: React.ReactNode;
      onClose?: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'bottom-sheet' },
        children,
        ReactActual.createElement(Pressable, {
          testID: 'sheet-backdrop-close',
          onPress: onClose,
        }),
      ),
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

jest.mock('../../../../../component-library/components/Badges/Badge', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, null),
    BadgeVariant: { Network: 'Network' },
  };
});

jest.mock('../../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: { Xs: 'xs', Sm: 'sm', Md: 'md', Lg: 'lg' },
}));

jest.mock('../../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => ({ uri: 'https://mock.icon' })),
}));

jest.mock('../../../Trending/components/TrendingTokenLogo', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, null),
  };
});

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectResolvedSelectedAccountGroup: jest.fn(),
  }),
);

jest.mock('./OndoPortfolio', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    AccountGroupSelectRow: ({
      group,
      onPress,
      isSelected,
    }: {
      group: { id: string };
      onPress: () => void;
      isSelected: boolean;
    }) =>
      ReactActual.createElement(
        Pressable,
        { testID: `account-row-${group.id}`, onPress },
        ReactActual.createElement(
          Text,
          null,
          isSelected ? 'selected' : 'unselected',
        ),
      ),
    getChainHex: jest.fn(() => '0x1'),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.ondo_campaign_portfolio.switch_account_sheet_prefix':
        'Switch to',
      'rewards.ondo_campaign_portfolio.switch_account_sheet_description':
        'Select an account to swap with.',
    };
    return translations[key] ?? key;
  },
}));

// ── test helpers ──────────────────────────────────────────────────────────────

const MOCK_GROUP_1 = {
  id: 'group-1',
  metadata: { name: 'Account 1' },
} as never;
const MOCK_GROUP_2 = {
  id: 'group-2',
  metadata: { name: 'Account 2' },
} as never;

const MOCK_PICKER_CONFIG: AccountPickerConfig = {
  row: {
    tokenAsset: 'eip155:1/erc20:0xabc',
    tokenSymbol: 'USDC',
    tokenName: 'USD Coin',
  } as never,
  entries: [
    { group: MOCK_GROUP_1, balance: '100' },
    { group: MOCK_GROUP_2, balance: '200' },
  ],
  tokenDecimals: 6,
};

const mockOnClose = jest.fn();
const mockOnGroupSelect = jest.fn();
const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockSheetRef = {
  current: {
    onOpenBottomSheet: jest.fn(),
    onCloseBottomSheet: mockOnCloseBottomSheet,
  },
} as unknown as React.RefObject<BottomSheetRef>;

const renderSheet = (
  overrides?: Partial<React.ComponentProps<typeof OndoAccountPickerSheet>>,
) =>
  render(
    <OndoAccountPickerSheet
      pendingPicker={MOCK_PICKER_CONFIG}
      sheetRef={mockSheetRef}
      onClose={mockOnClose}
      onGroupSelect={mockOnGroupSelect}
      {...overrides}
    />,
  );

// ── tests ─────────────────────────────────────────────────────────────────────

describe('OndoAccountPickerSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(null);
  });

  it('renders the bottom sheet', () => {
    const { getByTestId } = renderSheet();
    expect(getByTestId('bottom-sheet')).toBeDefined();
  });

  it('renders the sheet header', () => {
    const { getByTestId } = renderSheet();
    expect(getByTestId('bottom-sheet-header')).toBeDefined();
  });

  it('renders the sheet prefix text', () => {
    const { getByText } = renderSheet();
    expect(getByText('Switch to', { exact: false })).toBeDefined();
  });

  it('renders the token symbol', () => {
    const { getByText } = renderSheet();
    expect(getByText('USDC', { exact: false })).toBeDefined();
  });

  it('renders a row for each entry', () => {
    const { getByTestId } = renderSheet();
    expect(getByTestId('account-row-group-1')).toBeDefined();
    expect(getByTestId('account-row-group-2')).toBeDefined();
  });

  it('calls onClose when the BottomSheet backdrop onClose fires', () => {
    const { getByTestId } = renderSheet();
    fireEvent.press(getByTestId('sheet-backdrop-close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onCloseBottomSheet(onClose) when the header close button is pressed', () => {
    const { getByTestId } = renderSheet();
    fireEvent.press(getByTestId('sheet-header-close'));
    expect(mockOnCloseBottomSheet).toHaveBeenCalledWith(mockOnClose);
  });

  it('invokes onClose after the sheet animation when header close is pressed', () => {
    // mockOnCloseBottomSheet calls its callback immediately
    const { getByTestId } = renderSheet();
    fireEvent.press(getByTestId('sheet-header-close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onGroupSelect with the correct group when a row is pressed', () => {
    const { getByTestId } = renderSheet();
    fireEvent.press(getByTestId('account-row-group-1'));
    expect(mockOnGroupSelect).toHaveBeenCalledWith(MOCK_GROUP_1);
  });

  it('calls onGroupSelect with the second group when the second row is pressed', () => {
    const { getByTestId } = renderSheet();
    fireEvent.press(getByTestId('account-row-group-2'));
    expect(mockOnGroupSelect).toHaveBeenCalledWith(MOCK_GROUP_2);
  });

  it('marks the currently selected group row as selected', () => {
    mockUseSelector.mockReturnValue(MOCK_GROUP_2);
    const { getByTestId } = renderSheet();
    expect(getByTestId('account-row-group-2')).toHaveTextContent('selected');
    expect(getByTestId('account-row-group-1')).toHaveTextContent('unselected');
  });

  it('marks no row as selected when selectedGroup is null', () => {
    mockUseSelector.mockReturnValue(null);
    const { getByTestId } = renderSheet();
    expect(getByTestId('account-row-group-1')).toHaveTextContent('unselected');
    expect(getByTestId('account-row-group-2')).toHaveTextContent('unselected');
  });
});
