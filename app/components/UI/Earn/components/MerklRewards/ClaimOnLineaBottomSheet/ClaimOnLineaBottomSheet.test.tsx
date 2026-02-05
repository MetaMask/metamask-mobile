import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import ClaimOnLineaBottomSheet from './ClaimOnLineaBottomSheet';
import AppConstants from '../../../../../../core/AppConstants';

const mockOnContinue = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      onContinue: mockOnContinue,
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
  useSafeAreaFrame: () => ({ y: 0 }),
}));

const mockOnCloseBottomSheet = jest.fn();

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: React.forwardRef(
        (
          { children }: { children: React.ReactNode },
          ref: React.Ref<unknown>,
        ) => {
          React.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: (callback?: () => void) => {
              mockOnCloseBottomSheet();
              callback?.();
            },
          }));
          return <View testID="bottom-sheet">{children}</View>;
        },
      ),
    };
  },
);

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const React = jest.requireActual('react');
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        onClose,
        children,
      }: {
        onClose?: () => void;
        children?: React.ReactNode;
      }) => (
        <View testID="bottom-sheet-header">
          {children}
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              testID="bottom-sheet-close-button"
            >
              <Text>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      ),
    };
  },
);

jest.mock(
  '../../../../../../images/musd-icon-no-background-2x.png',
  () => 'mock-musd-icon',
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({ width: 120, height: 120 })),
  }),
}));

jest.mock('../../../../../../core/AppConstants', () => ({
  URLS: {
    MUSD_CONVERSION_BONUS_TERMS_OF_USE: 'https://metamask.io/musd-terms',
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const React = jest.requireActual('react');
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
    }) => React.createElement(View, { testID, ...props }, children),
    BoxAlignItems: { Center: 'center' },
    Button: ({
      children,
      onPress,
      testID,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
    }) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID },
        React.createElement(Text, {}, children),
      ),
    ButtonSize: { Lg: 'lg' },
    ButtonVariant: { Primary: 'primary' },
    Text: ({
      children,
      onPress,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      [key: string]: unknown;
    }) => {
      if (onPress) {
        return React.createElement(
          TouchableOpacity,
          { onPress, testID },
          React.createElement(Text, props, children),
        );
      }
      return React.createElement(Text, { testID, ...props }, children);
    },
    TextVariant: {
      HeadingLg: 'HeadingLg',
      BodyMd: 'BodyMd',
    },
  };
});

describe('ClaimOnLineaBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId, getByText } = render(<ClaimOnLineaBottomSheet />);

    expect(getByTestId('claim-on-linea-bottom-sheet')).toBeTruthy();
    expect(getByText('Claim bonuses on Linea')).toBeTruthy();
    expect(getByTestId('claim-on-linea-description')).toBeTruthy();
    expect(getByText('Terms apply.')).toBeTruthy();
    expect(getByText('Continue')).toBeTruthy();
  });

  it('renders mUSD education image', () => {
    const { getByTestId } = render(<ClaimOnLineaBottomSheet />);

    expect(getByTestId('claim-on-linea-musd-image')).toBeTruthy();
  });

  it('calls onContinue when Continue button is pressed', () => {
    const { getByTestId } = render(<ClaimOnLineaBottomSheet />);

    fireEvent.press(getByTestId('claim-on-linea-continue-button'));

    expect(mockOnContinue).toHaveBeenCalled();
  });

  it('closes bottom sheet immediately when Continue is pressed', () => {
    const { getByTestId } = render(<ClaimOnLineaBottomSheet />);

    fireEvent.press(getByTestId('claim-on-linea-continue-button'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });

  it('opens terms URL when Terms apply link is pressed', () => {
    const openURLSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(undefined);

    const { getByTestId } = render(<ClaimOnLineaBottomSheet />);

    fireEvent.press(getByTestId('claim-on-linea-terms-link'));

    expect(openURLSpy).toHaveBeenCalledWith(
      AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
    );
  });

  it('closes bottom sheet when close button is pressed', () => {
    const { getByTestId } = render(<ClaimOnLineaBottomSheet />);

    fireEvent.press(getByTestId('bottom-sheet-close-button'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });
});
