import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import Pna25BottomSheet from './Pna25BottomSheet';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { Linking } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Mock useMetrics hook
jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

// Mock Linking
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: {
    openURL: jest.fn(),
  },
}));

const Stack = createStackNavigator();

const renderComponent = (state = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name={Routes.MODAL.PNA25_NOTICE_BOTTOM_SHEET}>
        {() => <Pna25BottomSheet />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('Pna25BottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with all main elements', () => {
    const { getByText } = renderComponent();

    expect(getByText(strings('privacy_policy.pna25_title'))).toBeOnTheScreen();
    expect(
      getByText(strings('privacy_policy.pna25_description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('privacy_policy.pna25_description_2')),
    ).toBeOnTheScreen();
  });

  it('displays primary action button with correct label', () => {
    const { getByText } = renderComponent();

    expect(
      getByText(strings('privacy_policy.pna25_confirm_button')),
    ).toBeOnTheScreen();
  });

  it('displays secondary action button with correct label', () => {
    const { getByText } = renderComponent();

    expect(
      getByText(strings('privacy_policy.pna25_open_settings_button')),
    ).toBeOnTheScreen();
  });

  it('tracks view event on mount', () => {
    renderComponent();

    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalled();
  });

  it('navigates to security settings when open settings button is pressed', () => {
    const { getByText } = renderComponent();

    const openSettingsButton = getByText(
      strings('privacy_policy.pna25_open_settings_button'),
    );

    fireEvent.press(openSettingsButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.SECURITY_SETTINGS,
    });
  });

  it('opens external link when learn more link is pressed', () => {
    const { getByText } = renderComponent();

    const learnMoreLink = getByText(
      strings('privacy_policy.pna25_blog_post_link'),
    );

    fireEvent.press(learnMoreLink);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://metamask.io/blog/pna25/',
    );
  });
});
