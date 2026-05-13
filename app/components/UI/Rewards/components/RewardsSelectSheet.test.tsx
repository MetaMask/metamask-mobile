import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RewardsSelectSheet, {
  REWARDS_SELECT_SHEET_TEST_IDS,
  type RewardsSelectOption,
} from './RewardsSelectSheet';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
        testID,
      }: {
        children: React.ReactNode;
        testID?: string;
      }) => ReactActual.createElement(View, { testID }, children),
    };
  },
);

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
        onClose,
      }: {
        children: React.ReactNode;
        onClose?: () => void;
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'sheet-header' },
          ReactActual.createElement(Text, { testID: 'sheet-title' }, children),
          ReactActual.createElement(Pressable, {
            testID: 'sheet-header-close',
            onPress: onClose,
          }),
        ),
    };
  },
);

const OPTIONS: RewardsSelectOption[] = [
  { key: 'bronze', label: 'Bronze', value: 'STARTER' },
  { key: 'silver', label: 'Silver', value: 'MID' },
  { key: 'platinum', label: 'Platinum', value: 'UPPER' },
];

const mockOnSelect = jest.fn();

const buildRoute = (overrides?: Partial<RewardsSelectOption[]>) => ({
  route: {
    params: {
      title: 'Select Tier',
      options: (overrides as RewardsSelectOption[]) ?? OPTIONS,
      selectedValue: 'MID',
      onSelect: mockOnSelect,
    },
  },
});

describe('RewardsSelectSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the bottom sheet container', () => {
    const { getByTestId } = render(<RewardsSelectSheet {...buildRoute()} />);
    expect(getByTestId(REWARDS_SELECT_SHEET_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('displays the title in the header', () => {
    const { getByTestId } = render(<RewardsSelectSheet {...buildRoute()} />);
    expect(getByTestId('sheet-title').props.children).toBe('Select Tier');
  });

  it('renders all options', () => {
    const { getByTestId, getByText } = render(
      <RewardsSelectSheet {...buildRoute()} />,
    );

    for (const option of OPTIONS) {
      expect(
        getByTestId(`${REWARDS_SELECT_SHEET_TEST_IDS.OPTION}-${option.key}`),
      ).toBeDefined();
      expect(getByText(option.label)).toBeDefined();
    }
  });

  it('calls onSelect with the pressed option value and navigates back', () => {
    const { getByTestId } = render(<RewardsSelectSheet {...buildRoute()} />);

    fireEvent.press(
      getByTestId(`${REWARDS_SELECT_SHEET_TEST_IDS.OPTION}-bronze`),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith('STARTER');
  });

  it('navigates back when header close is pressed', () => {
    const { getByTestId } = render(<RewardsSelectSheet {...buildRoute()} />);

    fireEvent.press(getByTestId('sheet-header-close'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('renders with an empty options list without crashing', () => {
    const { getByTestId, queryByTestId } = render(
      <RewardsSelectSheet
        route={{
          params: {
            title: 'Empty',
            options: [],
            selectedValue: null,
            onSelect: mockOnSelect,
          },
        }}
      />,
    );

    expect(getByTestId(REWARDS_SELECT_SHEET_TEST_IDS.CONTAINER)).toBeDefined();
    expect(
      queryByTestId(`${REWARDS_SELECT_SHEET_TEST_IDS.OPTION}-bronze`),
    ).toBeNull();
  });

  it('selects the last option correctly', () => {
    const { getByTestId } = render(<RewardsSelectSheet {...buildRoute()} />);

    fireEvent.press(
      getByTestId(`${REWARDS_SELECT_SHEET_TEST_IDS.OPTION}-platinum`),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith('UPPER');
  });
});
