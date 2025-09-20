import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { NavigationContainer, useRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import SupportConsentScreen from './index';
import {
  setShouldShowConsentSheet,
  setDataSharingPreference,
} from '../../../actions/security';

// Mock the design system components
jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  Text: 'Text',
  TextVariant: {
    HeadingMd: 'HeadingMd',
    BodyMd: 'BodyMd',
  },
  BoxFlexDirection: {
    Row: 'row',
  },
  BoxAlignItems: {
    Center: 'center',
  },
  BoxJustifyContent: {
    Between: 'space-between',
  },
}));

// Mock the component library components
jest.mock('../../../component-library/components/Buttons/Button', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      label,
      onPress,
      ...props
    }: {
      label: string;
      onPress: () => void;
      [key: string]: unknown;
    }) =>
      React.createElement(
        TouchableOpacity,
        { ...props, onPress, testID: 'Button' },
        React.createElement('Text', {}, label),
      ),
    ButtonVariants: {
      Primary: 'Primary',
      Secondary: 'Secondary',
    },
    ButtonSize: {
      Lg: 'Lg',
    },
  };
});

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet/BottomSheet',
  () => {
    const React = jest.requireActual('react');
    return {
      __esModule: true,
      default: ({
        children,
        ...props
      }: {
        children: React.ReactNode;
        [key: string]: unknown;
      }) => React.createElement('BottomSheet', props, children),
    };
  },
);

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader',
  () => {
    const React = jest.requireActual('react');
    return {
      __esModule: true,
      default: ({
        children,
        ...props
      }: {
        children: React.ReactNode;
        [key: string]: unknown;
      }) => React.createElement('BottomSheetHeader', props, children),
    };
  },
);

jest.mock('../../../component-library/components/Checkbox/Checkbox', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      label,
      onPress,
      ...props
    }: {
      label: string;
      onPress: () => void;
      [key: string]: unknown;
    }) =>
      React.createElement(
        TouchableOpacity,
        { ...props, onPress, testID: 'Checkbox' },
        React.createElement('Text', {}, label),
      ),
  };
});

// Mock Redux actions
jest.mock('../../../actions/security', () => ({
  setShouldShowConsentSheet: jest.fn(),
  setDataSharingPreference: jest.fn(),
}));

// Mock useRoute hook
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn(),
}));

const mockDispatch = jest.fn();

const createMockRoute = (params = {}) => ({
  params: {
    onConsent: jest.fn(),
    onDecline: jest.fn(),
    ...params,
  },
});

const createMockStore = (): Store => ({
  dispatch: mockDispatch,
  getState: () => ({}),
  subscribe: jest.fn(),
  replaceReducer: jest.fn(),
  [Symbol.observable]: jest.fn(),
} as Store);

const Stack = createStackNavigator();

const TestScreen = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

const TestWrapper = ({
  children,
  store = createMockStore(),
}: {
  children: React.ReactNode;
  store?: ReturnType<typeof createMockStore>;
}) => (
  <Provider store={store}>
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Test">
          {() => <TestScreen>{children}</TestScreen>}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  </Provider>
);

describe('SupportConsentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders matching snapshot', () => {
    const mockRoute = createMockRoute();
    (useRoute as jest.Mock).mockReturnValue(mockRoute);

    const { toJSON } = render(
      <TestWrapper>
        <SupportConsentScreen />
      </TestWrapper>,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onConsent when consent button is pressed', () => {
    const mockOnConsent = jest.fn();
    const mockRoute = createMockRoute({ onConsent: mockOnConsent });
    (useRoute as jest.Mock).mockReturnValue(mockRoute);
    const { UNSAFE_getAllByType } = render(
      <TestWrapper>
        <SupportConsentScreen />
      </TestWrapper>,
    );

    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    const consentButton = buttons[2];
    fireEvent.press(consentButton);

    expect(mockOnConsent).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(setShouldShowConsentSheet(false));
    expect(mockDispatch).toHaveBeenCalledWith(setDataSharingPreference(true));
  });

  it('calls onDecline when decline button is pressed', () => {
    const mockOnDecline = jest.fn();
    const mockRoute = createMockRoute({ onDecline: mockOnDecline });
    (useRoute as jest.Mock).mockReturnValue(mockRoute);
    const { UNSAFE_getAllByType } = render(
      <TestWrapper>
        <SupportConsentScreen />
      </TestWrapper>,
    );

    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    const declineButton = buttons[1];
    fireEvent.press(declineButton);

    expect(mockOnDecline).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(setShouldShowConsentSheet(false));
    expect(mockDispatch).toHaveBeenCalledWith(setDataSharingPreference(false));
  });

  it('does not save preferences when checkbox is unchecked and consent is pressed', () => {
    const mockOnConsent = jest.fn();
    const mockRoute = createMockRoute({ onConsent: mockOnConsent });
    (useRoute as jest.Mock).mockReturnValue(mockRoute);
    const { UNSAFE_getAllByType } = render(
      <TestWrapper>
        <SupportConsentScreen />
      </TestWrapper>,
    );

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const checkbox = touchables[0];
    fireEvent.press(checkbox);

    const consentButton = touchables[2];
    fireEvent.press(consentButton);

    expect(mockOnConsent).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setShouldShowConsentSheet(false),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setDataSharingPreference(true),
    );
  });

  it('does not save preferences when checkbox is unchecked and decline is pressed', () => {
    const mockOnDecline = jest.fn();
    const mockRoute = createMockRoute({ onDecline: mockOnDecline });
    (useRoute as jest.Mock).mockReturnValue(mockRoute);
    const { UNSAFE_getAllByType } = render(
      <TestWrapper>
        <SupportConsentScreen />
      </TestWrapper>,
    );

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const checkbox = touchables[0];
    fireEvent.press(checkbox);

    const declineButton = touchables[1];
    fireEvent.press(declineButton);

    expect(mockOnDecline).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setShouldShowConsentSheet(false),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setDataSharingPreference(false),
    );
  });

  it('renders without crashing when route params are missing', () => {
    const mockRoute = { params: undefined };
    (useRoute as jest.Mock).mockReturnValue(mockRoute);

    expect(() => {
      render(
        <TestWrapper>
          <SupportConsentScreen />
        </TestWrapper>,
      );
    }).not.toThrow();
  });
});
