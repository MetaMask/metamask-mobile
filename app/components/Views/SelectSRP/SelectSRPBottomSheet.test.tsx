import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { SelectSRPBottomSheet } from './SelectSRPBottomSheet';
import { strings } from '../../../../locales/i18n';

const mockGoBack = jest.fn();
const mockIsFocused = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      isFocused: mockIsFocused,
    }),
  };
});

jest.mock('./SelectSRP', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockSelectSRP() {
    return (
      <View testID="mock-select-srp">
        <Text>SelectSRP</Text>
      </View>
    );
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactLib = jest.requireActual('react');
  const {
    View: MockView,
    Text: MockText,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  return {
    BottomSheet: ReactLib.forwardRef(
      (
        {
          children,
          goBack,
        }: {
          children: React.ReactNode;
          goBack?: () => void;
        },
        _ref: ReactLib.Ref<unknown>,
      ) => (
        <MockView testID="mock-bottom-sheet">
          <TouchableOpacity
            testID="bottom-sheet-invoke-go-back"
            onPress={goBack}
          >
            <MockText>invoke sheet goBack</MockText>
          </TouchableOpacity>
          {children}
        </MockView>
      ),
    ),
    BottomSheetHeader: ({
      children,
      onBack,
    }: {
      children: React.ReactNode;
      onBack?: () => void;
    }) => (
      <MockView testID="mock-bottom-sheet-header">
        <TouchableOpacity testID="header-back" onPress={onBack}>
          <MockText>header back</MockText>
        </TouchableOpacity>
        <MockText>{children}</MockText>
      </MockView>
    ),
    Box: ({ children }: { children: React.ReactNode }) => (
      <MockView testID="mock-box">{children}</MockView>
    ),
  };
});

describe('SelectSRPBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the SRP list title and list placeholder', () => {
    const { getByText, getByTestId } = render(<SelectSRPBottomSheet />);

    expect(
      getByText(strings('secure_your_wallet.srp_list_selection')),
    ).toBeOnTheScreen();
    expect(getByTestId('mock-select-srp')).toBeOnTheScreen();
  });

  it('calls navigation.goBack when goBack runs and the screen is focused', () => {
    mockIsFocused.mockReturnValue(true);

    const { getByTestId } = render(<SelectSRPBottomSheet />);

    fireEvent.press(getByTestId('header-back'));

    expect(mockIsFocused).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not call navigation.goBack when goBack runs but the screen is not focused', () => {
    mockIsFocused.mockReturnValue(false);

    const { getByTestId } = render(<SelectSRPBottomSheet />);

    fireEvent.press(getByTestId('bottom-sheet-invoke-go-back'));

    expect(mockIsFocused).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
