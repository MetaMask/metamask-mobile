import React from 'react';
import ManualBackupStep2 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { ManualBackUpStepsSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ManualBackUpSteps.selectors';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { InteractionManager, Platform } from 'react-native';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import { ReactTestInstance } from 'react-test-renderer';

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

// mock useMetrics
const mockMetricsIsEnabled = jest.fn().mockReturnValue(true);
jest.mock('../../../components/hooks/useMetrics', () => {
  const actual = jest.requireActual('../../../components/hooks/useMetrics');
  return {
    ...actual,
    useMetrics: () => ({
      isEnabled: mockMetricsIsEnabled,
    }),
  };
});

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
      params: {
        words: mockWords,
        backupFlow: false,
        settingsBackup: false,
        steps: ['one', 'two', 'three'],
      },
    });

    const setupTest = () => {
      const mockNavigate = jest.fn();
      const mockNavigationDispatch = jest.fn();

      const mockGoBack = jest.fn();
      const mockSetOptions = jest.fn();
      const mockDispatch = jest.fn();

      store.dispatch = mockDispatch;

      const mockNavigation = (useNavigation as jest.Mock).mockReturnValue({
        navigate: mockNavigate,
        goBack: mockGoBack,
        setOptions: mockSetOptions,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        isFocused: jest.fn(),
        reset: jest.fn(),
        dispatch: mockNavigationDispatch,
      });

      const wrapper = renderWithProvider(
        <Provider store={store}>
          <ManualBackupStep2
            route={mockRoute()}
            navigation={{
              navigate: mockNavigate,
              goBack: mockGoBack,
              setOptions: mockSetOptions,
              addListener: jest.fn(),
              removeListener: jest.fn(),
              isFocused: jest.fn(),
              dispatch: mockNavigationDispatch,
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

    it('render and handle word selection in grid', () => {
      Platform.OS = 'android';
      const { wrapper, mockNavigation } = setupTest();
      const gridItems = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.GRID_ITEM}-0`,
      );

      // Select a word
      fireEvent.press(gridItems);
      expect(gridItems).toHaveStyle({ backgroundColor: expect.any(String) });
      mockNavigation.mockRestore();
      Platform.OS = 'ios';
    });

    it('render SuccessErrorSheet with type error when seed phrase is invalid', () => {
      const { wrapper, mockNavigate, mockNavigation } = setupTest();

      const missingWordOne = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-0`,
      );
      const missingWordTwo = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-1`,
      );
      const missingWordThree = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-2`,
      );

      fireEvent.press(missingWordOne);
      fireEvent.press(missingWordTwo);
      fireEvent.press(missingWordThree);

      fireEvent.press(missingWordOne);
      fireEvent.press(missingWordTwo);
      fireEvent.press(missingWordThree);

      fireEvent.press(missingWordOne);
      fireEvent.press(missingWordTwo);
      fireEvent.press(missingWordThree);

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
          primaryButtonLabel: expect.any(String),
          type: 'error',
          onClose: expect.any(Function),
          onPrimaryButtonPress: expect.any(Function),
          closeOnPrimaryButtonPress: true,
        },
      });

      mockNavigation.mockRestore();
    });

    it('render SuccessErrorSheet with type success when seed phrase is valid and navigate to HomeNav', async () => {
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

      expect(missingWordItemOne.props.style.color).not.toBe('#4459ff');
      expect(missingWordItemTwo.props.style.color).not.toBe('#4459ff');
      expect(missingWordItemThree.props.style.color).not.toBe('#4459ff');

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

    it('navigate to Optin Metrics for onboarding flow', async () => {
      // configure onboarding scenario
      mockRoute.mockReturnValue({
        params: {
          words: mockWords,
          backupFlow: false,
          settingsBackup: false,
          steps: ['one', 'two', 'three'],
        },
      });
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
      });
    });

    it('navigate to Onboarding Success flow for onboarding backup flow', async () => {
      // configure onboarding scenario
      mockRoute.mockReturnValue({
        params: {
          words: mockWords,
          backupFlow: false,
          settingsBackup: false,
          steps: ['one', 'two', 'three'],
        },
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

    it('navigate to HomeNav for reminder backup flow', async () => {
      mockRoute.mockReturnValue({
        params: {
          words: mockWords,
          backupFlow: true,
          settingsBackup: false,
          steps: ['one', 'two', 'three'],
        },
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

    it('navigate to Onboarding Success with settings backup flow', async () => {
      mockRoute.mockReturnValue({
        params: {
          words: mockWords,
          backupFlow: false,
          settingsBackup: true,
          steps: ['one', 'two', 'three'],
        },
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

    it('on click of the missing word, the empty slot should be selected', async () => {
      const { wrapper } = setupTest();

      const missingWordOne = wrapper.getByTestId(
        `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-0`,
      );

      // Get all empty slots using GRID_ITEM_EMPTY test ID
      const emptySlots: ReactTestInstance[] = [];
      const nonEmptySlots: ReactTestInstance[] = [];

      // Try to find both types of slots for each index
      for (let i = 0; i < 12; i++) {
        try {
          const emptySlot = wrapper.getByTestId(
            `${ManualBackUpStepsSelectorsIDs.GRID_ITEM_EMPTY}-${i}`,
          );
          emptySlots.push(emptySlot);
        } catch (emptyError) {
          try {
            const nonEmptySlot = wrapper.getByTestId(
              `${ManualBackUpStepsSelectorsIDs.GRID_ITEM}-${i}`,
            );
            nonEmptySlots.push(nonEmptySlot);
          } catch (nonEmptyError) {
            // Skip if neither type is found (shouldn't happen)
          }
        }
      }

      expect(emptySlots).toHaveLength(3);
      expect(nonEmptySlots).toHaveLength(9);

      fireEvent.press(missingWordOne);
      // Press each empty slot
      fireEvent.press(emptySlots[0]);

      fireEvent.press(missingWordOne);

      // Verify we found exactly 3 empty slots and 9 non-empty slots
      expect(missingWordOne).toHaveStyle({
        borderColor: '#4459ff',
      });
    });

    it('on click of the empty slot, slot should be selected', async () => {
      const { wrapper } = setupTest();

      // Get all empty slots using GRID_ITEM_EMPTY test ID
      const emptySlots: ReactTestInstance[] = [];
      const nonEmptySlots: ReactTestInstance[] = [];

      // Try to find both types of slots for each index
      for (let i = 0; i < 12; i++) {
        try {
          const emptySlot = wrapper.getByTestId(
            `${ManualBackUpStepsSelectorsIDs.GRID_ITEM_EMPTY}-${i}`,
          );
          emptySlots.push(emptySlot);
        } catch (emptyError) {
          try {
            const nonEmptySlot = wrapper.getByTestId(
              `${ManualBackUpStepsSelectorsIDs.GRID_ITEM}-${i}`,
            );
            nonEmptySlots.push(nonEmptySlot);
          } catch (nonEmptyError) {
            // Skip if neither type is found (shouldn't happen)
          }
        }
      }

      expect(emptySlots).toHaveLength(3);
      expect(nonEmptySlots).toHaveLength(9);

      fireEvent.press(emptySlots[0]);

      expect(emptySlots[0]).toHaveStyle({
        borderColor: '#4459ff',
      });
    });
  });

  describe('with empty mockWords', () => {
    const mockRoute = {
      params: {
        words: [],
        steps: ['one', 'two', 'three'],
      },
    };

    const setupTest = () => {
      const mockNavigate = jest.fn();
      const mockGoBack = jest.fn();
      const mockSetOptions = jest.fn();
      const mockDispatch = jest.fn();

      store.dispatch = mockDispatch;

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
        <Provider store={store}>
          <ManualBackupStep2
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
        mockNavigation,
      };
    };

    it('check when words have empty array', async () => {
      const { wrapper, mockNavigation } = setupTest();

      // Press continue button
      const continueButton = wrapper.getByTestId(
        ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON,
      );

      fireEvent.press(continueButton);

      expect(continueButton).toBeTruthy();
      mockNavigation.mockRestore();
    });

    it('render header left button', () => {
      const { mockGoBack, mockSetOptions } = setupTest();

      expect(mockSetOptions).toHaveBeenCalled();
      const setOptionsCall = mockSetOptions.mock.calls[0][0];

      // Get the headerLeft function from the options
      const headerLeftComponent = setOptionsCall.headerLeft();

      // Verify the headerLeft component renders correctly
      expect(headerLeftComponent).toBeTruthy();

      // The headerLeft component should be a TouchableOpacity
      expect(headerLeftComponent.type).toBe('TouchableOpacity');

      // Simulate pressing the back button by calling onPress directly
      headerLeftComponent.props.onPress();

      // Verify that goBack was called
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
