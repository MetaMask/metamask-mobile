import React from 'react';
import ManualBackupStep2 from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { fireEvent } from '@testing-library/react-native';
import { ManualBackUpStepsSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ManualBackUpSteps.selectors';

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
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { wrapper } = setupTest();
    expect(wrapper).toMatchSnapshot();
  });

  it('should handle word selection and placement', () => {
    const { wrapper } = setupTest();
    const gridItems = wrapper.getAllByTestId('grid-item');

    // Select a word
    fireEvent.press(gridItems[0]);
    expect(gridItems[0]).toHaveStyle({ backgroundColor: expect.any(String) });
  });

  it('should show error modal when seed phrase is invalid', () => {
    const { wrapper, mockNavigate } = setupTest();

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
  });
});
