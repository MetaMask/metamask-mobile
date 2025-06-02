import React from 'react';
import ManualBackupStep1 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { ManualBackUpStepsSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ManualBackUpSteps.selectors';
import { AppThemeKey } from '../../../util/theme/models';
import { shallow } from 'enzyme';
import { strings } from '../../../../locales/i18n';

const mockStore = configureMockStore();
const initialState = {
  user: { appTheme: AppThemeKey.light },
};
const store = mockStore(initialState);

const initialStateDark = {
  user: { appTheme: AppThemeKey.dark },
};
const storeDark = mockStore(initialStateDark);

const initialStateOs = {
  user: { appTheme: AppThemeKey.os },
};
const storeOs = mockStore(initialStateOs);

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        default: '#000000',
      },
      background: {
        default: '#FFFFFF',
      },
    },
  }),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    InteractionManager: {
      runAfterInteractions: jest.fn((cb) => cb()),
    },
  };
});

describe('ManualBackupStep1', () => {
  const mockWords = [
    'abstract',
    'accident',
    'acoustic',
    'announce',
    'artefact',
    'attitude',
    'bachelor',
    'broccoli',
    'business',
    'category',
    'champion',
    'cinnamon',
  ];

  const mockRoute = {
    params: {
      words: mockWords,
      backupFlow: true,
      settingsBackup: true,
    },
  };

  const mockRouteOne = {
    params: {
      words: mockWords,
      backupFlow: true,
      settingsBackup: true,
    },
  };

  const setupTest = () => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();
    const mockDispatch = jest.fn();

    store.dispatch = mockDispatch;

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
    });

    const wrapper = renderWithProvider(
      <Provider store={store}>
        <ManualBackupStep1
          route={mockRoute}
          navigation={{
            navigate: mockNavigate,
            goBack: mockGoBack,
            setOptions: mockSetOptions,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            isFocused: jest.fn(),
          }}
        />
      </Provider>,
    );

    return {
      wrapper,
      mockNavigate,
      mockGoBack,
      mockSetOptions,
      mockDispatch,
    };
  };
  const setupTestDark = () => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();
    const mockDispatch = jest.fn();

    storeDark.dispatch = mockDispatch;

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
    });

    const wrapper = renderWithProvider(
      <Provider store={storeDark}>
        <ManualBackupStep1
          route={mockRoute}
          navigation={{
            navigate: mockNavigate,
            goBack: mockGoBack,
            setOptions: mockSetOptions,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            isFocused: jest.fn(),
          }}
        />
      </Provider>,
    );

    return {
      wrapper,
      mockNavigate,
      mockGoBack,
      mockSetOptions,
      mockDispatch,
    };
  };
  const setupTestOs = () => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();
    const mockDispatch = jest.fn();

    storeOs.dispatch = mockDispatch;

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
    });

    const wrapper = renderWithProvider(
      <Provider store={storeOs}>
        <ManualBackupStep1
          route={mockRoute}
          navigation={{
            navigate: mockNavigate,
            goBack: mockGoBack,
            setOptions: mockSetOptions,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            isFocused: jest.fn(),
          }}
        />
      </Provider>,
    );

    return {
      wrapper,
      mockNavigate,
      mockGoBack,
      mockSetOptions,
      mockDispatch,
    };
  };
  const setupTestMockRouteOne = () => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();
    const mockDispatch = jest.fn();

    storeOs.dispatch = mockDispatch;

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
    });

    const wrapper = renderWithProvider(
      <Provider store={storeOs}>
        <ManualBackupStep1
          route={mockRouteOne}
          navigation={{
            navigate: mockNavigate,
            goBack: mockGoBack,
            setOptions: mockSetOptions,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            isFocused: jest.fn(),
          }}
        />
      </Provider>,
    );

    return {
      wrapper,
      mockNavigate,
      mockGoBack,
      mockSetOptions,
      mockDispatch,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <ManualBackupStep1
          route={{
            params: {
              words: [
                'abstract',
                'accident',
                'acoustic',
                'announce',
                'artefact',
                'attitude',
                'bachelor',
                'broccoli',
                'business',
                'category',
                'champion',
                'cinnamon',
              ],
            },
          }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render 2 step confirm password', async () => {
    const { wrapper } = setupTest();
    expect(wrapper.getByText('Step 2 of 3')).toBeTruthy();

    expect(
      wrapper.getByText(strings('manual_backup_step_1.action')),
    ).toBeTruthy();
    expect(
      wrapper.getByText(strings('manual_backup_step_1.reveal')),
    ).toBeTruthy();

    const blurButton = wrapper.getByTestId(
      ManualBackUpStepsSelectorsIDs.BLUR_BUTTON,
    );
    fireEvent.press(blurButton);

    await waitFor(() => {
      expect(
        wrapper.getByTestId(`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-0`),
      ).toBeTruthy();
    });
  });

  it('should render 2 step confirm password with dark theme', async () => {
    const { wrapper } = setupTestDark();
    expect(wrapper.getByText('Step 2 of 3')).toBeTruthy();

    expect(
      wrapper.getByText(strings('manual_backup_step_1.action')),
    ).toBeTruthy();
    expect(
      wrapper.getByText(strings('manual_backup_step_1.reveal')),
    ).toBeTruthy();

    const blurButton = wrapper.getByTestId(
      ManualBackUpStepsSelectorsIDs.BLUR_BUTTON,
    );
    fireEvent.press(blurButton);

    await waitFor(() => {
      expect(
        wrapper.getByTestId(`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-0`),
      ).toBeTruthy();
    });
  });

  it('should render 2 step confirm password with os theme', async () => {
    const { wrapper, mockNavigate } = setupTestOs();
    expect(wrapper.getByText('Step 2 of 3')).toBeTruthy();

    expect(
      wrapper.getByText(strings('manual_backup_step_1.action')),
    ).toBeTruthy();
    expect(
      wrapper.getByText(strings('manual_backup_step_1.reveal')),
    ).toBeTruthy();

    const blurButton = wrapper.getByTestId(
      ManualBackUpStepsSelectorsIDs.BLUR_BUTTON,
    );
    fireEvent.press(blurButton);

    await waitFor(() => {
      expect(
        wrapper.getByTestId(`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-0`),
      ).toBeTruthy();
    });

    const srpText = wrapper.getByText(strings('manual_backup_step_1.info-2'));

    fireEvent.press(srpText);

    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'SeedphraseModal',
    });

    const confirmButton = wrapper.getByText(
      strings('manual_backup_step_1.continue'),
    );

    fireEvent.press(confirmButton);

    expect(confirmButton).toBeTruthy();
  });

  it('should render 2 step confirm', async () => {
    const { wrapper, mockNavigate } = setupTestOs();
    expect(wrapper.getByText('Step 2 of 3')).toBeTruthy();

    expect(
      wrapper.getByText(strings('manual_backup_step_1.action')),
    ).toBeTruthy();
    expect(
      wrapper.getByText(strings('manual_backup_step_1.reveal')),
    ).toBeTruthy();

    const blurButton = wrapper.getByTestId(
      ManualBackUpStepsSelectorsIDs.BLUR_BUTTON,
    );
    fireEvent.press(blurButton);

    await waitFor(() => {
      expect(
        wrapper.getByTestId(`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-0`),
      ).toBeTruthy();
    });

    const confirmButton = wrapper.getByText(
      strings('manual_backup_step_1.continue'),
    );

    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ManualBackupStep2', {
        words: mockWords,
        steps: [
          'Create Password',
          'Secure wallet',
          'Confirm Secret Recovery Phrase',
        ],
        backupFlow: true,
        settingsBackup: true,
      });
    });
  });

  it('should render with mock route one', async () => {
    const { wrapper } = setupTestMockRouteOne();
    expect(wrapper.getByText('Step 2 of 3')).toBeTruthy();

    expect(
      wrapper.getByText(strings('manual_backup_step_1.action')),
    ).toBeTruthy();
    expect(
      wrapper.getByText(strings('manual_backup_step_1.reveal')),
    ).toBeTruthy();
  });
});
