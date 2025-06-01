import React from 'react';
import AccountBackupStep1 from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import { ManualBackUpStepsSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ManualBackUpSteps.selectors';
import { fireEvent } from '@testing-library/react-native';
import configureStore from '../../../util/test/configureStore';
import { Provider } from 'react-redux';

// Use fake timers to resolve reanimated issues.
jest.useFakeTimers();

jest.mock('../../../actions/wizard', () => ({
  setOnboardingWizardStep: jest.fn(),
}));

jest.mock('../../../actions/onboarding', () => ({
  saveOnboardingEvent: jest.fn(),
}));

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
}));

jest.mock('../../../core/Engine', () => ({
  hasFunds: () => false,
}));

const mockStore = configureStore([]);

describe('AccountBackupStep1', () => {
  afterEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  const setupTest = () => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();

    const initialState = {
      engine: {
        backgroundState,
      },
    };

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
      reset: jest.fn(),
    });

    const store = mockStore; // Mocked Redux store

    const wrapper = renderWithProvider(
      <Provider store={store}>
        <AccountBackupStep1
          navigation={{
            navigate: mockNavigate,
            goBack: mockGoBack,
            setOptions: mockSetOptions,
          }}
          route={{}}
        />
      </Provider>,
      {
        state: initialState,
      },
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
    jest.mock('../../../core/Engine', () => ({
      hasFunds: () => true,
    }));
    const { wrapper, mockNavigate } = setupTest();
    const title = wrapper.getByText(strings('account_backup_step_1.title'));
    expect(title).toBeTruthy();

    const explanationText = wrapper.getByTestId(
      ManualBackUpStepsSelectorsIDs.SEEDPHRASE_LINK,
    );
    expect(explanationText).toBeTruthy();
    fireEvent.press(explanationText);
    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'SeedphraseModal',
    });
  });

  it('should render cta actions', () => {
    const { wrapper, mockNavigate } = setupTest();
    const reminderButton = wrapper.getByText(
      strings('account_backup_step_1.remind_me_later'),
    );
    expect(reminderButton).toBeTruthy();

    fireEvent.press(reminderButton);
    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'SkipAccountSecurityModal',
      params: {
        onConfirm: expect.any(Function),
        onCancel: expect.any(Function),
      },
    });

    const continueButton = wrapper.getByText(
      strings('account_backup_step_1.cta_text'),
    );
    expect(continueButton).toBeTruthy();

    fireEvent.press(continueButton);
    expect(mockNavigate).toHaveBeenCalledWith('ManualBackupStep1', {});
  });
});
