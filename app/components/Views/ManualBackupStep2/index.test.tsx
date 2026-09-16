import React from 'react';
import ManualBackupStep2 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { fireEvent, waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ManualBackUpStepsSelectorsIDs } from '../ManualBackupStep1/ManualBackUpSteps.testIds';
import { ManualBackupConfirmErrorSheetSelectorsIDs } from './ManualBackupConfirmErrorSheet.testIds';
import Routes from '../../../constants/navigation/Routes';
import { InteractionManager, Platform } from 'react-native';
import {
  AccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../../constants/onboarding';
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

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          testID,
          onClose,
        }: {
          children?: React.ReactNode;
          testID?: string;
          onClose?: () => void;
        },
        ref: React.ForwardedRef<unknown>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: (callback?: () => void) => {
            callback?.();
          },
          onCloseBottomSheet: (callback?: () => void) => {
            onClose?.();
            callback?.();
          },
        }));

        return <View testID={testID}>{children}</View>;
      },
    ),
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

    const fillMissingWordsInCorrectOrder = (
      wrapper: ReturnType<typeof setupTest>['wrapper'],
    ) => {
      const getMissingWords = (index: number) =>
        wrapper.getByTestId(
          `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-${index}`,
        );
      const getWordText = (index: number) => {
        const wordItem = wrapper.getByTestId(
          `${ManualBackUpStepsSelectorsIDs.WORD_ITEM_MISSING}-${index}`,
        );
        const children = wordItem.props.children;
        if (typeof children === 'string') {
          return children;
        }
        return String(getMissingWords(index).props.accessibilityLabel ?? '');
      };

      const missingWordOrder = [
        { click: getMissingWords(0), text: getWordText(0) },
        { click: getMissingWords(1), text: getWordText(1) },
        { click: getMissingWords(2), text: getWordText(2) },
      ];

      const sortMissingOrder = missingWordOrder.sort(
        (a, b) => mockWords.indexOf(a.text) - mockWords.indexOf(b.text),
      );

      sortMissingOrder.forEach(({ text }) => {
        expect(mockWords).toContain(text);
      });

      sortMissingOrder.forEach(({ click }) => {
        fireEvent.press(click);
      });
    };

    it('updates grid item style when a word is selected on Android', () => {
      Platform.OS = 'android';
      const { wrapper, mockNavigation } = setupTest();

      // Filled cells use grid-item-N; empty confirmation slots use grid-item-empty-N.
      // Which indexes are empty depends on shuffle, so pick any filled cell.
      const gridItem = wrapper.getAllByTestId(
        new RegExp(`^${ManualBackUpStepsSelectorsIDs.GRID_ITEM}-\\d+$`),
      )[0];
      fireEvent.press(gridItem);

      expect(gridItem).toBeOnTheScreen();
      mockNavigation.mockRestore();
      Platform.OS = 'ios';
    });

    it('opens error sheet when seed phrase words are selected in wrong order', async () => {
      const { wrapper, mockNavigate, mockNavigation } = setupTest();
      const getMissingWord = (index: number) =>
        wrapper.getByTestId(
          `${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-${index}`,
        );

      fireEvent.press(getMissingWord(0));
      fireEvent.press(getMissingWord(1));
      fireEvent.press(getMissingWord(2));

      await waitFor(() => {
        expect(
          wrapper.getByTestId(
            ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET,
          ),
        ).toBeOnTheScreen();
      });
      expect(mockNavigate).not.toHaveBeenCalled();

      mockNavigation.mockRestore();
    });

    it('navigates to onboarding success when words match', async () => {
      const { wrapper, mockNavigate, mockNavigationDispatch } = setupTest();

      fillMissingWordsInCorrectOrder(wrapper);

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
      expect(mockNavigationDispatch).toHaveBeenCalledWith(resetAction);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates to OptinMetrics when analytics is disabled during onboarding', async () => {
      mockRoute.mockReturnValue({ params: { ...defaultRouteParams } });
      mockMetricsIsEnabled.mockReturnValue(false);

      const { wrapper, mockNavigate, mockDispatch } = setupTest();

      fillMissingWordsInCorrectOrder(wrapper);

      expect(mockDispatch).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('OptinMetrics', {
        successFlow: ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP,
        accountType: AccountType.Metamask,
      });
    });

    it('navigates to onboarding success flow when analytics is enabled', async () => {
      mockRoute.mockReturnValue({ params: { ...defaultRouteParams } });
      mockMetricsIsEnabled.mockReturnValue(true);

      const { wrapper, mockNavigate, mockNavigationDispatch, mockDispatch } =
        setupTest();

      fillMissingWordsInCorrectOrder(wrapper);

      expect(mockDispatch).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();

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
      expect(mockNavigationDispatch).toHaveBeenCalledWith(resetAction);
    });

    it('navigates to onboarding success with reminder backup flow', async () => {
      mockRoute.mockReturnValue({
        params: { ...defaultRouteParams, backupFlow: true },
      });
      mockMetricsIsEnabled.mockReturnValue(true);

      const { wrapper, mockNavigationDispatch, mockDispatch } = setupTest();

      fillMissingWordsInCorrectOrder(wrapper);

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
      expect(mockNavigationDispatch).toHaveBeenCalledWith(resetAction);
    });

    it('navigates to onboarding success with settings backup flow', async () => {
      mockRoute.mockReturnValue({
        params: { ...defaultRouteParams, settingsBackup: true },
      });
      mockMetricsIsEnabled.mockReturnValue(true);

      const { wrapper, mockDispatch, mockNavigationDispatch } = setupTest();

      fillMissingWordsInCorrectOrder(wrapper);

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

    it('disables a missing-word option after it is used', async () => {
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

      expect(missingWordOne).toBeDisabled();
    });

    it('keeps empty confirmation slots pressable', async () => {
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

      expect(emptySlots[0]).toBeEnabled();
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

    it('does not auto-validate when words array is empty', async () => {
      const { wrapper, mockNavigate, mockNavigation } = setupTest();

      expect(
        wrapper.queryByTestId(ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON),
      ).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
      mockNavigation.mockRestore();
    });

    it('does not configure navigation header via setOptions', () => {
      const { mockSetOptions } = setupTest();

      expect(mockSetOptions).not.toHaveBeenCalled();
    });
  });

  describe('HeaderStandard back button', () => {
    it('triggers goBack when back button is pressed', () => {
      const mockGoBack = jest.fn();
      const navProps = createMockNavigationProps({ goBack: mockGoBack });

      (useNavigation as jest.Mock).mockReturnValue(navProps);

      const wrapper = renderWithProvider(
        <Provider store={store}>
          <ManualBackupStep2
            route={{ params: { ...defaultRouteParams } }}
            navigation={navProps}
          />
        </Provider>,
      );

      fireEvent.press(
        wrapper.getByTestId(ManualBackUpStepsSelectorsIDs.BACK_BUTTON),
      );

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('error sheet callbacks', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
      global.Math = mockMath;
    });

    const setupErrorSheet = async () => {
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

      await waitFor(() => {
        expect(
          wrapper.getByTestId(
            ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET,
          ),
        ).toBeOnTheScreen();
      });

      return { wrapper };
    };

    it('regenerates grid with 3 empty slots when error sheet try-again is pressed', async () => {
      const { wrapper } = await setupErrorSheet();

      fireEvent.press(
        wrapper.getByTestId(
          ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET_TRY_AGAIN_BUTTON,
        ),
      );

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

    it('regenerates grid with 3 empty slots when error sheet close is pressed', async () => {
      const { wrapper } = await setupErrorSheet();

      fireEvent.press(
        wrapper.getByTestId(
          ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET_CLOSE_BUTTON,
        ),
      );

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

  describe('success navigation', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
      global.Math = mockMath;
      mockMetricsIsEnabled.mockReturnValue(true);
    });

    it('dispatches navigation reset when all missing words match', () => {
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

      expect(mockNavigationDispatch).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('with duplicate BIP-39 words in the seed phrase', () => {
    it('always shows three uniquely labeled missing-word options', () => {
      // Restore real Math.random so selection exercises retries / uniqueness.
      global.Math = Math;

      const wordsWithDuplicate = [
        'abstract',
        'accident',
        'abstract',
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

      const navProps = createMockNavigationProps();
      (useNavigation as jest.Mock).mockReturnValue(navProps);

      const { getByTestId } = renderWithProvider(
        <Provider store={store}>
          <ManualBackupStep2
            route={{
              params: {
                ...defaultRouteParams,
                words: wordsWithDuplicate,
              },
            }}
            navigation={navProps}
          />
        </Provider>,
      );

      const labels = [0, 1, 2].map(
        (index) =>
          getByTestId(
            `${ManualBackUpStepsSelectorsIDs.WORD_ITEM_MISSING}-${index}`,
          ).props.children,
      );

      expect(labels).toHaveLength(3);
      expect(new Set(labels).size).toBe(3);
    });
  });
});
