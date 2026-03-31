import React from 'react';
import ManualBackupStep2 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { ManualBackUpStepsSelectorsIDs } from '../ManualBackupStep1/ManualBackUpSteps.testIds';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { InteractionManager, Platform } from 'react-native';
import {
  AccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../../constants/onboarding';
import { ReactTestInstance } from 'react-test-renderer';
import { brandColor } from '@metamask/design-tokens';

const mockStore = configureMockStore();
const initialState = {
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
  onboarding: {
    events: [],
  },
};
const store = mockStore(initialState);

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    InteractionManager: {
      runAfterInteractions: jest.fn((cb) => cb()),
    },
  };
});

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
// Mock Math.random to return deterministic values
const mockMath = Object.create(global.Math);
mockMath.random = () => 0.5;

// mock useAnalytics
const mockMetricsIsEnabled = jest.fn().mockReturnValue(true);
jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    isEnabled: mockMetricsIsEnabled,
  }),
}));

describe('ManualBackupStep2', () => {
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

  const defaultRouteParams = {
    words: mockWords,
    backupFlow: false,
    settingsBackup: false,
    steps: ['one', 'two', 'three'],
  };

  const createMockNavigationProps = (
    overrides: Record<string, jest.Mock> = {},
  ) => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    isFocused: jest.fn(),
    reset: jest.fn(),
    dispatch: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.Math = mockMath;
  });

  afterEach(() => {
    global.Math = Math;
  });

  describe('with mockWords', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    const mockRoute = jest.fn().mockReturnValue({
      params: { ...defaultRouteParams },
    });

    const setupTest = () => {
      const mockNavigate = jest.fn();
      const mockNavigationDispatch = jest.fn();
      const mockGoBack = jest.fn();
      const mockSetOptions = jest.fn();
      const mockDispatch = jest.fn();

      store.dispatch = mockDispatch;

      const navProps = createMockNavigationProps({
        navigate: mockNavigate,
        goBack: mockGoBack,
        setOptions: mockSetOptions,
        dispatch: mockNavigationDispatch,
      });

      const mockNavigation = (useNavigation as jest.Mock).mockReturnValue(
        navProps,
      );

      const wrapper = renderWithProvider(
        <Provider store={store}>
          <ManualBackupStep2 route={mockRoute()} navigation={navProps} />
        </Provider>,
      );

      return {
        wrapper,
        mockNavigate,
        mockGoBack,
        mockSetOptions,
        mockDispatch,
        mockNavigation,
        mockNavigationDispatch,
      };
    };

    const setupSuccessFlow = (
      wrapper: ReturnType<typeof setupTest>['wrapper'],
      mockNavigate: jest.Mock,
    ) => {
      const getMissingWords = (index: number) =>
        wrapper.getByTestId(
          `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-${index}`,
        );
      const getWordItem = (index: number) =>
        wrapper.getByTestId(
          `${ManualBackUpStepsSelectorsIDs.WORD_ITEM_MISSING}-${index}`,
        );

      const missingWordOrder = [
        { click: getMissingWords(0), text: getWordItem(0).props.children },
        { click: getMissingWords(1), text: getWordItem(1).props.children },
        { click: getMissingWords(2), text: getWordItem(2).props.children },
      ];

      const sortMissingOrder = missingWordOrder.sort(
        (a, b) => mockWords.indexOf(a.text) - mockWords.indexOf(b.text),
      );

      // Verify that the missing words are actually from mockWords
      sortMissingOrder.forEach(({ text }) => {
        expect(mockWords).toContain(text);
      });

      // Click the missing words in order
      sortMissingOrder.forEach(({ click }) => {
        fireEvent.press(click);
      });

      // Press continue button
      const continueButton = wrapper.getByTestId(
        ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON,
      );

      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
        screen: 'SuccessErrorSheet',
        params: {
          title: expect.any(String),
          description: expect.any(String),
          primaryButtonLabel: strings('manual_backup_step_2.success-button'),
          type: 'success',
          onClose: expect.any(Function),
          onPrimaryButtonPress: expect.any(Function),
          closeOnPrimaryButtonPress: true,
        },
      });

      // Get the success onPrimaryButtonPress function and call it
      const successCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'RootModalFlow' && call[1].screen === 'SuccessErrorSheet',
      );
      const onPrimaryButtonPress = successCall[1].params.onPrimaryButtonPress;
      return {
        onPrimaryButtonPress,
      };
    };

    it('updates grid item style when a word is selected on Android', () => {
      Platform.OS = 'android';
      const { wrapper, mockNavigation } = setupTest();

      const gridItem = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.GRID_ITEM}-0`,
      );
      fireEvent.press(gridItem);

      expect(gridItem).toHaveStyle({ backgroundColor: expect.any(String) });
      mockNavigation.mockRestore();
      Platform.OS = 'ios';
    });

    it('opens error sheet when seed phrase words are selected in wrong order', () => {
      const { wrapper, mockNavigate, mockNavigation } = setupTest();
      const getMissingWord = (index: number) =>
        wrapper.getByTestId(
          `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-${index}`,
        );

      fireEvent.press(getMissingWord(0));
      fireEvent.press(getMissingWord(1));
      fireEvent.press(getMissingWord(2));
      fireEvent.press(getMissingWord(0));
      fireEvent.press(getMissingWord(1));
      fireEvent.press(getMissingWord(2));
      fireEvent.press(getMissingWord(0));
      fireEvent.press(getMissingWord(1));
      fireEvent.press(getMissingWord(2));

      const continueButton = wrapper.getByTestId(
        ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON,
      );
      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
        screen: 'SuccessErrorSheet',
        params: {
          title: expect.any(String),
          description: expect.any(String),
          primaryButtonLabel: expect.any(String),
          type: 'error',
          onClose: expect.any(Function),
          onPrimaryButtonPress: expect.any(Function),
          closeOnPrimaryButtonPress: true,
        },
      });

      mockNavigation.mockRestore();
    });

    it('opens success sheet and navigates to onboarding success when words match', async () => {
      const { wrapper, mockNavigate, mockNavigationDispatch } = setupTest();

      const missingWordOne = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-0`,
      );
      const missingWordItemOne = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.WORD_ITEM_MISSING}-0`,
      );
      const missingWordTwo = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-1`,
      );
      const missingWordItemTwo = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.WORD_ITEM_MISSING}-1`,
      );
      const missingWordThree = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-2`,
      );
      const missingWordItemThree = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.WORD_ITEM_MISSING}-2`,
      );

      const missingWordOrder = [
        { click: missingWordOne, text: missingWordItemOne.props.children },
        { click: missingWordTwo, text: missingWordItemTwo.props.children },
        { click: missingWordThree, text: missingWordItemThree.props.children },
      ];

      const sortMissingOrder = missingWordOrder.sort(
        (a, b) => mockWords.indexOf(a.text) - mockWords.indexOf(b.text),
      );

      // Verify that the missing words are actually from mockWords
      sortMissingOrder.forEach(({ text }) => {
        expect(mockWords).toContain(text);
      });

      // Click the missing words in order
      sortMissingOrder.forEach(({ click }) => {
        fireEvent.press(click);
      });

      expect(missingWordItemOne.props.style.color).not.toBe(brandColor.blue500);
      expect(missingWordItemTwo.props.style.color).not.toBe(brandColor.blue500);
      expect(missingWordItemThree.props.style.color).not.toBe(
        brandColor.blue500,
      );

      // Press continue button
      const continueButton = wrapper.getByTestId(
        ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON,
      );

      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
        screen: 'SuccessErrorSheet',
        params: {
          title: expect.any(String),
          description: expect.any(String),
          primaryButtonLabel: strings('manual_backup_step_2.success-button'),
          type: 'success',
          onClose: expect.any(Function),
          onPrimaryButtonPress: expect.any(Function),
          closeOnPrimaryButtonPress: true,
        },
      });

      // Get the success onPrimaryButtonPress function and call it
      const successCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'RootModalFlow' && call[1].screen === 'SuccessErrorSheet',
      );
      const onPrimaryButtonPress = successCall[1].params.onPrimaryButtonPress;

      // Call the success button press function
      onPrimaryButtonPress();

      const resetAction = CommonActions.reset({
        index: 0,
        routes: [
          {
            name: Routes.ONBOARDING.SUCCESS_FLOW,
            params: {
              screen: Routes.ONBOARDING.SUCCESS,
              params: {
                successFlow: ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP,
              },
            },
          },
        ],
      });
      await waitFor(() => {
        expect(mockNavigationDispatch).toHaveBeenCalledWith(resetAction);
      });
    });

    it('navigates to OptinMetrics when analytics is disabled during onboarding', async () => {
      mockRoute.mockReturnValue({ params: { ...defaultRouteParams } });
      mockMetricsIsEnabled.mockReturnValue(false);

      // setup test
      const { wrapper, mockNavigate, mockDispatch } = setupTest();

      const { onPrimaryButtonPress } = setupSuccessFlow(wrapper, mockNavigate);

      mockNavigate.mockClear();
      mockDispatch.mockClear();
      // Call the success button press function
      onPrimaryButtonPress();

      expect(mockDispatch).toHaveBeenCalled();

      expect(mockNavigate).toHaveBeenCalledWith('OptinMetrics', {
        onContinue: expect.any(Function),
        accountType: AccountType.Metamask,
      });
    });

    it('navigates to onboarding success flow when analytics is enabled', async () => {
      mockRoute.mockReturnValue({ params: { ...defaultRouteParams } });
      mockMetricsIsEnabled.mockReturnValue(true);

      // setup test
      const { wrapper, mockNavigate, mockNavigationDispatch, mockDispatch } =
        setupTest();

      const { onPrimaryButtonPress } = setupSuccessFlow(wrapper, mockNavigate);

      mockNavigate.mockClear();
      mockDispatch.mockClear();
      // Call the success button press function
      onPrimaryButtonPress();

      expect(mockDispatch).toHaveBeenCalled();

      const resetAction = CommonActions.reset({
        index: 0,
        routes: [
          {
            name: Routes.ONBOARDING.SUCCESS_FLOW,
            params: {
              screen: Routes.ONBOARDING.SUCCESS,
              params: {
                successFlow: ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP,
              },
            },
          },
        ],
      });
      await waitFor(() => {
        expect(mockNavigationDispatch).toHaveBeenCalledWith(resetAction);
      });
    });

    it('navigates to onboarding success with reminder backup flow', async () => {
      mockRoute.mockReturnValue({
        params: { ...defaultRouteParams, backupFlow: true },
      });
      mockMetricsIsEnabled.mockReturnValue(true);

      // setup test
      const { wrapper, mockNavigate, mockNavigationDispatch, mockDispatch } =
        setupTest();

      const { onPrimaryButtonPress } = setupSuccessFlow(wrapper, mockNavigate);

      mockNavigate.mockClear();
      mockDispatch.mockClear();
      // Call the success button press function
      onPrimaryButtonPress();

      expect(mockDispatch).toHaveBeenCalled();

      const resetAction = CommonActions.reset({
        index: 0,
        routes: [
          {
            name: Routes.ONBOARDING.SUCCESS_FLOW,
            params: {
              screen: Routes.ONBOARDING.SUCCESS,
              params: {
                successFlow: ONBOARDING_SUCCESS_FLOW.REMINDER_BACKUP,
              },
            },
          },
        ],
      });
      await waitFor(() => {
        expect(mockNavigationDispatch).toHaveBeenCalledWith(resetAction);
      });
    });

    it('navigates to onboarding success with settings backup flow', async () => {
      mockRoute.mockReturnValue({
        params: { ...defaultRouteParams, settingsBackup: true },
      });
      mockMetricsIsEnabled.mockReturnValue(true);

      // setup test
      const { wrapper, mockNavigate, mockDispatch, mockNavigationDispatch } =
        setupTest();

      const { onPrimaryButtonPress } = setupSuccessFlow(wrapper, mockNavigate);

      mockNavigate.mockClear();
      mockDispatch.mockClear();
      // Call the success button press function
      onPrimaryButtonPress();

      expect(mockDispatch).toHaveBeenCalled();
      const resetAction = CommonActions.reset({
        index: 0,
        routes: [
          {
            name: Routes.ONBOARDING.SUCCESS_FLOW,
            params: {
              screen: Routes.ONBOARDING.SUCCESS,
              params: {
                successFlow: ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP,
              },
            },
          },
        ],
      });
      expect(mockNavigationDispatch).toHaveBeenCalledWith(resetAction);
    });

    it('highlights missing word with blue border after selecting it for an empty slot', async () => {
      const { wrapper } = setupTest();
      const missingWordOne = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-0`,
      );
      const emptySlots: ReactTestInstance[] = [];
      const nonEmptySlots: ReactTestInstance[] = [];
      for (let i = 0; i < 12; i++) {
        try {
          const emptySlot = wrapper.getByTestId(
            `${ManualBackUpStepsSelectorsIDs.GRID_ITEM_EMPTY}-${i}`,
          );
          emptySlots.push(emptySlot);
        } catch {
          try {
            const nonEmptySlot = wrapper.getByTestId(
              `${ManualBackUpStepsSelectorsIDs.GRID_ITEM}-${i}`,
            );
            nonEmptySlots.push(nonEmptySlot);
          } catch {
            // index not present
          }
        }
      }

      expect(emptySlots).toHaveLength(3);
      expect(nonEmptySlots).toHaveLength(9);

      fireEvent.press(missingWordOne);
      fireEvent.press(emptySlots[0]);
      fireEvent.press(missingWordOne);

      expect(missingWordOne).toHaveStyle({ borderColor: brandColor.blue500 });
    });

    it('highlights empty slot with blue border when pressed', async () => {
      const { wrapper } = setupTest();
      const emptySlots: ReactTestInstance[] = [];
      const nonEmptySlots: ReactTestInstance[] = [];
      for (let i = 0; i < 12; i++) {
        try {
          const emptySlot = wrapper.getByTestId(
            `${ManualBackUpStepsSelectorsIDs.GRID_ITEM_EMPTY}-${i}`,
          );
          emptySlots.push(emptySlot);
        } catch {
          try {
            const nonEmptySlot = wrapper.getByTestId(
              `${ManualBackUpStepsSelectorsIDs.GRID_ITEM}-${i}`,
            );
            nonEmptySlots.push(nonEmptySlot);
          } catch {
            // index not present
          }
        }
      }

      expect(emptySlots).toHaveLength(3);
      expect(nonEmptySlots).toHaveLength(9);

      fireEvent.press(emptySlots[0]);

      expect(emptySlots[0]).toHaveStyle({ borderColor: brandColor.blue500 });
    });
  });

  describe('with empty mockWords', () => {
    const emptyRoute = {
      params: { ...defaultRouteParams, words: [] },
    };

    const setupTest = () => {
      const mockNavigate = jest.fn();
      const mockGoBack = jest.fn();
      const mockSetOptions = jest.fn();
      const mockDispatch = jest.fn();

      store.dispatch = mockDispatch;

      const navProps = createMockNavigationProps({
        navigate: mockNavigate,
        goBack: mockGoBack,
        setOptions: mockSetOptions,
      });

      const mockNavigation = (useNavigation as jest.Mock).mockReturnValue(
        navProps,
      );

      const wrapper = renderWithProvider(
        <Provider store={store}>
          <ManualBackupStep2 route={emptyRoute} navigation={navProps} />
        </Provider>,
      );

      return {
        wrapper,
        mockNavigate,
        mockGoBack,
        mockSetOptions,
        mockDispatch,
        mockNavigation,
      };
    };

    it('renders continue button when words array is empty', async () => {
      const { wrapper, mockNavigation } = setupTest();

      const continueButton = wrapper.getByTestId(
        ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON,
      );
      fireEvent.press(continueButton);

      expect(continueButton).toBeOnTheScreen();
      mockNavigation.mockRestore();
    });

    it('configures navigation header with headerLeft component', () => {
      const { mockSetOptions } = setupTest();

      expect(mockSetOptions).toHaveBeenCalled();
      const setOptionsCall = mockSetOptions.mock.calls[0][0];

      expect(setOptionsCall.headerLeft).toEqual(expect.any(Function));
    });
  });

  describe('headerLeft back button', () => {
    it('triggers goBack when headerLeft back button is pressed', () => {
      const mockGoBack = jest.fn();
      const mockSetOptions = jest.fn();

      const navProps = createMockNavigationProps({
        goBack: mockGoBack,
        setOptions: mockSetOptions,
      });

      (useNavigation as jest.Mock).mockReturnValue(navProps);

      renderWithProvider(
        <Provider store={store}>
          <ManualBackupStep2
            route={{ params: { ...defaultRouteParams } }}
            navigation={navProps}
          />
        </Provider>,
      );

      const headerLeftComponent = mockSetOptions.mock.calls[0][0].headerLeft;
      expect(headerLeftComponent).toEqual(expect.any(Function));

      const backButton = renderWithProvider(headerLeftComponent());
      const backButtonElement = backButton.getByTestId(
        ManualBackUpStepsSelectorsIDs.BACK_BUTTON,
      );
      fireEvent.press(backButtonElement);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('error sheet callbacks', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
      global.Math = mockMath;
    });

    const setupErrorSheet = () => {
      const mockNavigate = jest.fn();
      const mockSetOptions = jest.fn();

      const navProps = createMockNavigationProps({
        navigate: mockNavigate,
        setOptions: mockSetOptions,
      });

      (useNavigation as jest.Mock).mockReturnValue(navProps);

      const wrapper = renderWithProvider(
        <Provider store={store}>
          <ManualBackupStep2
            route={{ params: { ...defaultRouteParams } }}
            navigation={navProps}
          />
        </Provider>,
      );

      const getMissingWords = (index: number) =>
        wrapper.getByTestId(
          `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-${index}`,
        );

      fireEvent.press(getMissingWords(0));
      fireEvent.press(getMissingWords(1));
      fireEvent.press(getMissingWords(2));
      fireEvent.press(getMissingWords(0));
      fireEvent.press(getMissingWords(1));
      fireEvent.press(getMissingWords(2));
      fireEvent.press(getMissingWords(0));
      fireEvent.press(getMissingWords(1));
      fireEvent.press(getMissingWords(2));

      const continueButton = wrapper.getByTestId(
        ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON,
      );
      fireEvent.press(continueButton);

      const errorCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'RootModalFlow' && call[1]?.params?.type === 'error',
      );

      return { wrapper, errorCall };
    };

    it('regenerates grid with 3 empty slots when error sheet primary button is pressed', () => {
      const { wrapper, errorCall } = setupErrorSheet();
      expect(errorCall).not.toBeUndefined();

      act(() => {
        errorCall[1].params.onPrimaryButtonPress();
      });

      const emptySlots: ReactTestInstance[] = [];
      for (let i = 0; i < 12; i++) {
        try {
          emptySlots.push(
            wrapper.getByTestId(
              `${ManualBackUpStepsSelectorsIDs.GRID_ITEM_EMPTY}-${i}`,
            ),
          );
        } catch {
          // filled slot — skip
        }
      }
      expect(emptySlots).toHaveLength(3);
    });

    it('regenerates grid with 3 empty slots when error sheet onClose is called', () => {
      const { wrapper, errorCall } = setupErrorSheet();
      expect(errorCall).not.toBeUndefined();

      act(() => {
        errorCall[1].params.onClose();
      });

      const emptySlots: ReactTestInstance[] = [];
      for (let i = 0; i < 12; i++) {
        try {
          emptySlots.push(
            wrapper.getByTestId(
              `${ManualBackUpStepsSelectorsIDs.GRID_ITEM_EMPTY}-${i}`,
            ),
          );
        } catch {
          // filled slot — skip
        }
      }
      expect(emptySlots).toHaveLength(3);
    });
  });

  describe('success sheet onClose callback', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
      global.Math = mockMath;
      mockMetricsIsEnabled.mockReturnValue(true);
    });

    it('dispatches navigation reset when success sheet onClose is called', () => {
      const mockNavigate = jest.fn();
      const mockNavigationDispatch = jest.fn();
      const mockSetOptions = jest.fn();

      const navProps = createMockNavigationProps({
        navigate: mockNavigate,
        setOptions: mockSetOptions,
        dispatch: mockNavigationDispatch,
      });

      (useNavigation as jest.Mock).mockReturnValue(navProps);

      const wrapper = renderWithProvider(
        <Provider store={store}>
          <ManualBackupStep2
            route={{ params: { ...defaultRouteParams } }}
            navigation={navProps}
          />
        </Provider>,
      );

      const getMissingWords = (index: number) =>
        wrapper.getByTestId(
          `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-${index}`,
        );
      const getWordItem = (index: number) =>
        wrapper.getByTestId(
          `${ManualBackUpStepsSelectorsIDs.WORD_ITEM_MISSING}-${index}`,
        );

      const missingWordOrder = [
        { click: getMissingWords(0), text: getWordItem(0).props.children },
        { click: getMissingWords(1), text: getWordItem(1).props.children },
        { click: getMissingWords(2), text: getWordItem(2).props.children },
      ];

      missingWordOrder
        .sort((a, b) => mockWords.indexOf(a.text) - mockWords.indexOf(b.text))
        .forEach(({ click }) => fireEvent.press(click));

      const continueButton = wrapper.getByTestId(
        ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON,
      );
      fireEvent.press(continueButton);

      const successCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === 'RootModalFlow' && call[1]?.params?.type === 'success',
      );
      expect(successCall).not.toBeUndefined();

      const { onClose } = successCall[1].params;
      expect(onClose).toEqual(expect.any(Function));
      onClose();

      expect(mockNavigationDispatch).toHaveBeenCalled();
    });
  });
});
