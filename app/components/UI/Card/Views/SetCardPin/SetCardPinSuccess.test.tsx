import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { SetCardPinSelectors } from './SetCardPin.testIds';

const mockReset = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    reset: mockReset,
  }),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = Object.assign((..._args: unknown[]) => ({}), {
    style: jest.fn(() => ({})),
  });
  return { useTailwind: () => tw };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    Box: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
    Text: ({ children, ...props }: { children?: React.ReactNode }) => (
      <Text {...props}>{children}</Text>
    ),
    TextVariant: { BodyMd: 'BodyMd', HeadingLg: 'HeadingLg' },
    BoxAlignItems: { Center: 'center' },
    BoxJustifyContent: { Center: 'center' },
    Icon: () => <View testID="success-check-icon" />,
    IconName: { Check: 'Check' },
    IconColor: { SuccessInverse: 'SuccessInverse' },
    IconSize: { Xl: 'Xl' },
    Button: ({
      children,
      onPress,
      testID,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
    }) => (
      <Pressable testID={testID} onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    ),
    ButtonVariant: { Primary: 'Primary' },
    ButtonSize: { Lg: 'Lg' },
  };
});

import SetCardPinSuccess from './SetCardPinSuccess';

describe('SetCardPinSuccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders success content and resets to Card Home on Done', () => {
    const { getByTestId } = renderWithProvider(<SetCardPinSuccess />);

    expect(getByTestId(SetCardPinSelectors.SUCCESS_ICON)).toBeOnTheScreen();
    expect(getByTestId(SetCardPinSelectors.SUCCESS_TITLE)).toBeOnTheScreen();

    fireEvent.press(getByTestId(SetCardPinSelectors.DONE_BUTTON));
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
  });
});
