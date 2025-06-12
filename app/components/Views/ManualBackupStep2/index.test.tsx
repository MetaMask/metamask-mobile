import React from 'react';
import ManualBackupStep2 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { fireEvent } from '@testing-library/react-native';
import { ManualBackUpStepsSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ManualBackUpSteps.selectors';
import { strings } from '../../../../locales/i18n';

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

// Mock Math.random to return deterministic values
const mockMath = Object.create(global.Math);
mockMath.random = () => 0.5;

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
    const mockRoute = {
      params: {
        words: mockWords,
        backupFlow: true,
        settingsBackup: true,
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

    it('render and handle word selection in grid', () => {
      const { wrapper, mockNavigation } = setupTest();
      const gridItems = wrapper.getAllByTestId('grid-item');

      // Select a word
      fireEvent.press(gridItems[0]);
      expect(gridItems[0]).toHaveStyle({ backgroundColor: expect.any(String) });
      mockNavigation.mockRestore();
    });

    it('render SuccessErrorSheet with type error when seed phrase is invalid', () => {
      const { wrapper, mockNavigate, mockNavigation } = setupTest();

      // Fill words incorrectly
      const gridItems = wrapper.getAllByTestId(
        ManualBackUpStepsSelectorsIDs.GRID_ITEM,
      );

      mockWords.reverse().forEach((_, index) => {
        fireEvent.press(gridItems[index]);
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
      const { wrapper, mockNavigate, mockNavigation } = setupTest();

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
          closeOnPrimaryButtonPress: false,
        },
      });

      // Click the missing words in order
      sortMissingOrder.forEach(({ click }) => {
        fireEvent.press(click);
      });

      expect(continueButton.props.disabled).toBe(true);

      // Click the missing words in order
      sortMissingOrder.forEach(({ click }) => {
        fireEvent.press(click);
      });

      // Fill words incorrectly
      const gridItems = wrapper.getAllByTestId(
        ManualBackUpStepsSelectorsIDs.GRID_ITEM,
      );

      mockWords.forEach((_, index) => {
        fireEvent.press(gridItems[index], index);
      });

      expect(continueButton.props.disabled).toBe(true);

      expect(missingWordItemOne.props.style.color).toBe('#4459ff');
      expect(missingWordItemTwo.props.style.color).toBe('#4459ff');
      expect(missingWordItemThree.props.style.color).toBe('#4459ff');
      mockNavigation.mockRestore();
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
  });
});
