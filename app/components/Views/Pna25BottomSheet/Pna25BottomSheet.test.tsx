import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import Pna25BottomSheet, { Pna25BottomSheetAction } from './Pna25BottomSheet';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { Linking } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { MetaMetricsEvents } from '../../../core/Analytics';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ mockEvent: true });
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

// Mock Redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

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

  it('renders with all main elements', () => {
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

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.NOTICE_UPDATE_DISPLAYED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      name: 'pna25',
      action: Pna25BottomSheetAction.VIEWED,
    });
    expect(mockBuild).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith({ mockEvent: true });
  });

  it('does not dispatch acknowledgement on view', () => {
    renderComponent();

    // Dispatch should NOT be called for VIEWED action
    expect(mockDispatch).not.toHaveBeenCalled();
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
      'https://metamask.io/news/updating-metamask-analytics',
    );
  });

  it('tracks "accept and close" event when confirm button is pressed', () => {
    const { getByText } = renderComponent();
    const confirmButton = getByText(
      strings('privacy_policy.pna25_confirm_button'),
    );

    fireEvent.press(confirmButton);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.NOTICE_UPDATE_DISPLAYED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      name: 'pna25',
      action: Pna25BottomSheetAction.ACCEPT_AND_CLOSE,
    });
    expect(mockBuild).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith({ mockEvent: true });
  });

  it('dispatches acknowledgement when confirm button is pressed', () => {
    const { getByText } = renderComponent();
    const confirmButton = getByText(
      strings('privacy_policy.pna25_confirm_button'),
    );

    fireEvent.press(confirmButton);

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('tracks "open settings" event when open settings button is pressed', () => {
    const { getByText } = renderComponent();
    const openSettingsButton = getByText(
      strings('privacy_policy.pna25_open_settings_button'),
    );

    fireEvent.press(openSettingsButton);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.NOTICE_UPDATE_DISPLAYED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      name: 'pna25',
      action: Pna25BottomSheetAction.OPEN_SETTINGS,
    });
    expect(mockBuild).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith({ mockEvent: true });
  });

  it('dispatches acknowledgement when open settings button is pressed', () => {
    const { getByText } = renderComponent();
    const openSettingsButton = getByText(
      strings('privacy_policy.pna25_open_settings_button'),
    );

    fireEvent.press(openSettingsButton);

    expect(mockDispatch).toHaveBeenCalled();
  });
});
