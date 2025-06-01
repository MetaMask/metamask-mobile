import React from 'react';
import AccountBackupStep1B from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import { fireEvent } from '@testing-library/react-native';

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
});
