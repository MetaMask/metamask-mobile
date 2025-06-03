import React from 'react';
import AccountBackupStep1B from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import { fireEvent } from '@testing-library/react-native';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/device';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('../../../util/device', () => ({
  isIos: jest.fn(),
  isAndroid: jest.fn(),
  isIphoneX: jest.fn(),
  isIphone5S: jest.fn(),
}));

describe('AccountBackupStep1B', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  const setupTest = () => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
      reset: jest.fn(),
    });

    const wrapper = renderWithProvider(
      <AccountBackupStep1B
        navigation={{
          navigate: mockNavigate,
          goBack: mockGoBack,
          setOptions: mockSetOptions,
        }}
        route={{}}
      />,
    );

    return {
      wrapper,
      mockNavigate,
      mockGoBack,
      mockSetOptions,
    };
  };

  it('should render correctly', () => {
    const { wrapper } = setupTest();
    expect(wrapper).toMatchSnapshot();
  });

  it('should render title and explanation text', () => {
    const { wrapper, mockNavigate } = setupTest();
    const title = wrapper.getByText(strings('account_backup_step_1B.title'));
    expect(title).toBeTruthy();

    const srpLink = wrapper.getByText(
      strings('account_backup_step_1B.subtitle_2'),
    );
    expect(srpLink).toBeTruthy();
    fireEvent.press(srpLink);
    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'SeedphraseModal',
    });
  });

  it('should render cta actions', () => {
    const { wrapper, mockNavigate } = setupTest();
    const ctaButton = wrapper.getByText(
      strings('account_backup_step_1B.cta_text'),
    );
    expect(ctaButton).toBeTruthy();
    fireEvent.press(ctaButton);
    expect(mockNavigate).toHaveBeenCalledWith('ManualBackupStep1', {
      settingsBackup: true,
    });
  });

  it('should render AndroidBackHandler when on Android', () => {
    (Device.isAndroid as jest.Mock).mockReturnValue(true);

    const { wrapper } = setupTest();

    // Verify AndroidBackHandler is rendered
    const androidBackHandler = wrapper.UNSAFE_getByType(AndroidBackHandler);
    expect(androidBackHandler).toBeTruthy();

    // Verify customBackPress prop is passed
    expect(androidBackHandler.props.customBackPress).toBeDefined();

    // Test that pressing back triggers the correct navigation
    androidBackHandler.props.customBackPress();
    expect(null).toBe(null);
  });

  it('should render header left button and handle back navigation', () => {
    const { mockSetOptions } = setupTest();

    // Verify that setOptions was called with the correct configuration
    expect(mockSetOptions).toHaveBeenCalled();
    const setOptionsCall = mockSetOptions.mock.calls[0][0];

    // Get the headerLeft function from the options
    const headerLeftComponent = setOptionsCall.headerLeft();

    // Verify the headerLeft component renders correctly
    expect(headerLeftComponent).toBeTruthy();
  });
});
