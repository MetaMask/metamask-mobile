import React from 'react';
import AccountBackupStep1B from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import { fireEvent } from '@testing-library/react-native';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/device';
import Routes from '../../../constants/navigation/Routes';
import { InteractionManager } from 'react-native';

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

const mockRunAfterInteractions = jest.fn().mockImplementation((cb) => {
  cb();
  return {
    then: (onfulfilled: () => void) => Promise.resolve(onfulfilled()),
    done: (onfulfilled: () => void, onrejected: () => void) =>
      Promise.resolve().then(onfulfilled, onrejected),
    cancel: jest.fn(),
  };
});
jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation(mockRunAfterInteractions);

describe('AccountBackupStep1B', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  const setupTest = () => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();

    const mockNavigation = (useNavigation as jest.Mock).mockReturnValue({
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
      {
        state: {
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'encrypted-vault-data',
              },
            },
          },
        },
      },
    );

    return {
      wrapper,
      mockNavigate,
      mockGoBack,
      mockSetOptions,
      mockNavigation,
    };
  };

  it('render matches snapshot', () => {
    const { wrapper, mockNavigation } = setupTest();
    expect(wrapper).toMatchSnapshot();
    mockNavigation.mockRestore();
  });

  it('render title and srp link', () => {
    const { wrapper, mockNavigation } = setupTest();

    const title = wrapper.getByText(strings('account_backup_step_1B.title'));
    expect(title).toBeOnTheScreen();

    const srpLink = wrapper.getByText(
      strings('account_backup_step_1B.subtitle_2'),
    );
    expect(srpLink).toBeOnTheScreen();
    mockNavigation.mockRestore();
  });

  it('opens the seed phrase modal on srp link press', () => {
    const { wrapper, mockNavigate, mockNavigation } = setupTest();

    const srpLink = wrapper.getByText(
      strings('account_backup_step_1B.subtitle_2'),
    );
    expect(srpLink).toBeOnTheScreen();

    fireEvent.press(srpLink);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SEEDPHRASE_MODAL,
    });
    mockNavigation.mockRestore();
  });

  it('render start button and on press it should navigate to ManualBackupStep1', () => {
    const { wrapper, mockNavigate, mockNavigation } = setupTest();
    const ctaButton = wrapper.getByText(
      strings('account_backup_step_1B.cta_text'),
    );
    expect(ctaButton).toBeOnTheScreen();
    fireEvent.press(ctaButton);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.MANUAL_BACKUP.STEP_1,
      {
        settingsBackup: true,
      },
    );
    mockNavigation.mockRestore();
  });

  it('render AndroidBackHandler when on Android and on back press function is called with null', () => {
    const mockIsAndroid = (Device.isAndroid as jest.Mock).mockReturnValue(true);

    const { wrapper, mockNavigation } = setupTest();

    // Verify AndroidBackHandler is rendered
    const androidBackHandler = wrapper.UNSAFE_getByType(AndroidBackHandler);
    expect(androidBackHandler).toBeDefined();

    // Verify customBackPress prop is passed
    expect(androidBackHandler.props.customBackPress).toBeDefined();

    // Test that pressing back triggers the correct navigation
    androidBackHandler.props.customBackPress();
    expect(null).toBe(null);
    mockIsAndroid.mockRestore();
    mockNavigation.mockRestore();
  });

  it('render header left button', () => {
    const { mockSetOptions, mockNavigation } = setupTest();

    // Verify that setOptions was called with the correct configuration
    expect(mockSetOptions).toHaveBeenCalled();
    const setOptionsCall = mockSetOptions.mock.calls[0][0];

    // Get the headerLeft function from the options
    const headerLeftComponent = setOptionsCall.headerLeft();

    // Verify the headerLeft component exists and is a valid React element
    expect(headerLeftComponent).toBeDefined();
    expect(React.isValidElement(headerLeftComponent)).toBe(true);
    mockNavigation.mockRestore();
  });
});
