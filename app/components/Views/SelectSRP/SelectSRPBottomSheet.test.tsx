import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { SelectSRPBottomSheet } from './SelectSRPBottomSheet';
import { SelectSRPBottomSheetTestIds } from './SelectSRPBottomSheet.testIds';
import { goBackIfFocused } from './SelectSRPBottomSheet.utils';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={initialMetrics}>{ui}</SafeAreaProvider>,
  );

const mockGoBack = jest.fn();
const mockIsFocused = jest.fn();
const mockNavigate = jest.fn();
const mockOnCloseBottomSheet = jest.fn(
  (callback?: () => void) => callback?.(),
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      isFocused: mockIsFocused,
      navigate: mockNavigate,
    }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
        }: {
          children?: React.ReactNode;
        },
        ref: React.Ref<{ onCloseBottomSheet: typeof mockOnCloseBottomSheet }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
          onOpenBottomSheet: jest.fn(),
        }));
        return children;
      },
    ),
  };
});

jest.mock('./SelectSRP', () => {
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return function MockSelectSRP({
    onKeyringSelect,
  }: {
    onKeyringSelect?: (keyringId: string) => void;
  }) {
    return (
      <View testID="mock-select-srp">
        <Text>SelectSRP</Text>
        <Pressable
          testID="mock-select-srp-item"
          onPress={() => onKeyringSelect?.('test-keyring-id')}
        />
      </View>
    );
  };
});

describe('SelectSRPBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the SRP list title and list placeholder', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <SelectSRPBottomSheet />,
    );

    expect(
      getByText(strings('secure_your_wallet.srp_list_selection')),
    ).toBeOnTheScreen();
    expect(getByTestId('mock-select-srp')).toBeOnTheScreen();
  });

  it('calls navigation.goBack when the header back button is pressed and the screen is focused', () => {
    mockIsFocused.mockReturnValue(true);

    const { getByTestId } = renderWithProviders(<SelectSRPBottomSheet />);

    fireEvent.press(
      getByTestId(SelectSRPBottomSheetTestIds.HEADER_BACK_BUTTON),
    );

    expect(mockIsFocused).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not call navigation.goBack when the header back button is pressed and the screen is not focused', () => {
    mockIsFocused.mockReturnValue(false);

    const { getByTestId } = renderWithProviders(<SelectSRPBottomSheet />);

    fireEvent.press(
      getByTestId(SelectSRPBottomSheetTestIds.HEADER_BACK_BUTTON),
    );

    expect(mockIsFocused).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('dismisses the sheet before navigating to reveal private credential', () => {
    const { getByTestId } = renderWithProviders(<SelectSRPBottomSheet />);

    fireEvent.press(getByTestId('mock-select-srp-item'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
      {
        shouldUpdateNav: true,
        keyringId: 'test-keyring-id',
      },
    );
  });
});

describe('goBackIfFocused', () => {
  it('calls goBack when the screen is focused', () => {
    const goBack = jest.fn();
    const isFocused = jest.fn().mockReturnValue(true);

    goBackIfFocused({ isFocused, goBack });

    expect(isFocused).toHaveBeenCalled();
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('does not call goBack when the screen is not focused', () => {
    const goBack = jest.fn();
    const isFocused = jest.fn().mockReturnValue(false);

    goBackIfFocused({ isFocused, goBack });

    expect(isFocused).toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
  });
});
