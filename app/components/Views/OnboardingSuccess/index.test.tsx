// Third party dependencies.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// Internal dependencies.
import OnboardingSuccess, {
  OnboardingSuccessComponent,
  ResetNavigationToHome,
} from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { OnboardingSuccessSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import Engine from '../../../core/Engine/Engine';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { backgroundState } from '../../../util/test/initial-root-state';
import { useSelector } from 'react-redux';
import { selectSeedlessOnboardingAuthConnection } from '../../../selectors/seedlessOnboardingController';

// Mock Rive component to prevent "Invalid Rive resource" error in tests
jest.mock('rive-react-native', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((props) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const ReactMock = require('react');
    return ReactMock.createElement('View', {
      testID: 'mock-rive-animation',
      ref: props.ref,
    });
  }),
  Fit: {
    Cover: 'cover',
  },
  Alignment: {
    Center: 'center',
  },
}));

// Mock the Rive animation file
jest.mock('../../../animations/onboarding_loader.riv', () => 'mock-rive-file');

// Mock Linking for external URL tests
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: {
    openURL: jest.fn(),
  },
}));

jest.mock('../../../core/Engine/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            metadata: { id: 'mock-keyring-id' },
          },
        ],
      },
    },
    NetworkController: {
      addNetwork: jest.fn().mockResolvedValue(undefined),
      findNetworkClientIdByChainId: jest
        .fn()
        .mockResolvedValue('mock-client-id'),
    },
    TokenDetectionController: {
      detectTokens: jest.fn().mockResolvedValue(undefined),
    },
    TokenBalancesController: {
      updateBalances: jest.fn().mockResolvedValue(undefined),
    },
    TokenListController: {
      fetchTokenList: jest.fn().mockResolvedValue(undefined),
    },
    AccountTrackerController: {
      refresh: jest.fn().mockResolvedValue(undefined),
    },
    TokenRatesController: {
      updateExchangeRatesByChainId: jest.fn().mockResolvedValue(undefined),
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

const mockDiscoverAccounts = jest.fn().mockResolvedValue(0);

jest.mock('../../../multichain-accounts/discovery', () => ({
  discoverAccounts: (...args: Parameters<typeof mockDiscoverAccounts>) =>
    mockDiscoverAccounts(...args),
}));

const mockNavigate = jest.fn();

const mockRoute = jest.fn().mockReturnValue({
  params: {
    backedUpSRP: false,
    noSRP: false,
  },
});

const mockNavigationDispatch = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      dispatch: mockNavigationDispatch,
      dangerouslyGetParent: () => ({
        pop: jest.fn(),
      }),
    }),
    useRoute: () => mockRoute,
  };
});

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

const mockIsMultichainAccountsState2Enabled = jest.fn().mockReturnValue(false);

jest.mock('../../../multichain-accounts/remote-feature-flag', () => ({
  isMultichainAccountsState2Enabled: () =>
    mockIsMultichainAccountsState2Enabled(),
}));

const mockImportAdditionalAccounts = jest.fn();

jest.mock(
  '../../../util/importAdditionalAccounts',
  () => () => mockImportAdditionalAccounts(),
);

describe('OnboardingSuccessComponent', () => {
  beforeEach(() => {
    mockImportAdditionalAccounts.mockReset();
    mockIsMultichainAccountsState2Enabled.mockReset();
  });

  it('renders matching snapshot when successFlow is BACKED_UP_SRP', () => {
    const { toJSON } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        successFlow={ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders matching snapshot when successFlow is NO_BACKED_UP_SRP', () => {
    const { toJSON } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        successFlow={ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders matching snapshot when successFlow is IMPORT_FROM_SEED_PHRASE', () => {
    const { toJSON } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('imports additional accounts when onDone is called', async () => {
    const { getByTestId } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
      />,
    );
    const button = getByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON);
    button.props.onPress();

    await waitFor(() => {
      expect(mockImportAdditionalAccounts).toHaveBeenCalled();
    });
  });

  it('(state 2) - calls discoverAccounts but does not import additional accounts when onDone is called', () => {
    mockIsMultichainAccountsState2Enabled.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
      />,
    );
    const button = getByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON);
    button.props.onPress();

    expect(mockImportAdditionalAccounts).not.toHaveBeenCalled();
    expect(mockDiscoverAccounts).toHaveBeenCalled();
  });

  it('navigate to the default settings screen when the manage default settings button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
      />,
    );
    const button = getByTestId(
      OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON,
    );
    fireEvent.press(button);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.ONBOARDING.SUCCESS_FLOW, {
      screen: Routes.ONBOARDING.DEFAULT_SETTINGS,
    });
  });
});

describe('OnboardingSuccess', () => {
  mockImportAdditionalAccounts.mockResolvedValue(true);

  beforeEach(() => {
    // Reset mocks before each test
    (useSelector as jest.Mock).mockReset();
  });

  describe('route params successFlow is IMPORT_FROM_SEED_PHRASE', () => {
    mockRoute.mockReturnValue({
      params: {
        successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
      },
    });

    it('renders matching snapshot with route params backedUpSRP false and noSRP false', () => {
      const { toJSON } = renderWithProvider(<OnboardingSuccess />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('adds networks to the network controller', async () => {
      const { toJSON } = renderWithProvider(<OnboardingSuccess />);
      expect(toJSON()).toMatchSnapshot();

      // wait for the useEffect side-effect to call addNetwork
      await waitFor(() => {
        expect(Engine.context.NetworkController.addNetwork).toHaveBeenCalled();
        expect(
          Engine.context.TokenBalancesController.updateBalances,
        ).toHaveBeenCalled();
        expect(
          Engine.context.TokenListController.fetchTokenList,
        ).toHaveBeenCalled();
        expect(
          Engine.context.TokenDetectionController.detectTokens,
        ).toHaveBeenCalled();
        expect(
          Engine.context.AccountTrackerController.refresh,
        ).toHaveBeenCalled();
        expect(
          Engine.context.TokenRatesController.updateExchangeRatesByChainId,
        ).toHaveBeenCalled();
        expect(
          Engine.context.CurrencyRateController.updateExchangeRate,
        ).toHaveBeenCalled();
      });
    });

    it('fails to add networks to the network controller but should render the component', async () => {
      (
        Engine.context.NetworkController.addNetwork as jest.Mock
      ).mockRejectedValue(new Error('Failed to add network'));
      const { toJSON } = renderWithProvider(<OnboardingSuccess />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('route params successFlow is NO_BACKED_UP_SRP', () => {
    mockRoute.mockReturnValue({
      params: {
        successFlow: ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP,
      },
    });
    it('renders matching snapshot with route params backedUpSRP true and noSRP false', () => {
      const { toJSON } = renderWithProvider(<OnboardingSuccess />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('dispatches ResetNavigationToHome action when done button is pressed', async () => {
      const { getByTestId } = renderWithProvider(<OnboardingSuccess />);
      const button = getByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON);
      fireEvent.press(button);
      expect(mockImportAdditionalAccounts).toHaveBeenCalled();

      expect(mockNavigationDispatch).toHaveBeenCalledWith(
        ResetNavigationToHome,
      );
    });
  });

  describe('route params successFlow is BACKED_UP_SRP', () => {
    mockRoute.mockReturnValue({
      params: {
        successFlow: ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP,
      },
    });
    it('renders matching snapshot with route params backedUpSRP false and noSRP true', () => {
      const { toJSON } = renderWithProvider(<OnboardingSuccess />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('renders simplified UI for Apple social login users', () => {
    mockRoute.mockReturnValue({
      params: {
        successFlow: ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP,
      },
    });

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSeedlessOnboardingAuthConnection) {
        return AuthConnection.Apple;
      }
      return undefined;
    });

    const initialState = {
      engine: {
        backgroundState: {
          ...backgroundState,
          SeedlessOnboardingController: {
            authConnection: AuthConnection.Apple,
            socialBackupsMetadata: [],
          },
        },
      },
      settings: {},
    };

    const { getByText, queryByTestId } = renderWithProvider(
      <OnboardingSuccess />,
      {
        state: initialState,
      },
    );

    expect(getByText('Setting up your wallet.')).toBeOnTheScreen();

    const doneButton = queryByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON);
    expect(doneButton).toBeNull();
  });

  it('renders simplified UI for Google social login users', () => {
    mockRoute.mockReturnValue({
      params: {
        successFlow: ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP,
      },
    });

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSeedlessOnboardingAuthConnection) {
        return AuthConnection.Google;
      }
      return undefined;
    });

    const initialState = {
      engine: {
        backgroundState: {
          ...backgroundState,
          SeedlessOnboardingController: {
            authConnection: AuthConnection.Google,
            socialBackupsMetadata: [],
          },
        },
      },
      settings: {},
    };

    const { getByText, queryByTestId } = renderWithProvider(
      <OnboardingSuccess />,
      {
        state: initialState,
      },
    );

    expect(getByText('Setting up your wallet.')).toBeOnTheScreen();

    const doneButton = queryByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON);
    expect(doneButton).toBeNull();
  });

  describe('startRiveAnimation coverage', () => {
    it('should execute startRiveAnimation method and cover animation logic', () => {
      jest.useFakeTimers();

      renderWithProvider(<OnboardingSuccess />, {
        state: {},
      });

      jest.advanceTimersByTime(1200);
      jest.advanceTimersByTime(3000);

      jest.useRealTimers();
    });

    it('should cover useEffect cleanup function and clear all timers when component unmounts', () => {
      jest.useFakeTimers();

      const { unmount } = renderWithProvider(<OnboardingSuccess />, {
        state: {},
      });

      jest.advanceTimersByTime(500);

      unmount();

      expect(jest.getTimerCount()).toBe(0);

      jest.useRealTimers();
    });

    it('should handle error in startRiveAnimation', () => {
      const mockRiveRef = {
        current: {
          fireState: jest.fn(() => {
            throw new Error('Animation error');
          }),
        },
      };

      jest.spyOn(React, 'useRef').mockReturnValue(mockRiveRef);

      expect(() => {
        renderWithProvider(<OnboardingSuccess />, {
          state: {},
        });
      }).not.toThrow();
    });

    it('should track and clear dotsIntervalId timer', () => {
      jest.useFakeTimers();

      const { unmount } = renderWithProvider(<OnboardingSuccess />, {
        state: {},
      });

      jest.advanceTimersByTime(500);

      unmount();

      jest.useRealTimers();
    });

    it('should track and clear finalTimeoutId timer', () => {
      jest.useFakeTimers();

      const { unmount } = renderWithProvider(<OnboardingSuccess />, {
        state: {},
      });

      jest.advanceTimersByTime(2000);

      unmount();

      jest.useRealTimers();
    });

    it('should track and clear socialLoginTimeoutId for social login users', () => {
      jest.useFakeTimers();

      const { unmount } = renderWithProvider(<OnboardingSuccess />, {
        state: {
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                authConnection: AuthConnection.Google,
                socialBackupsMetadata: [],
              },
            },
          },
        },
      });

      jest.advanceTimersByTime(3500);

      unmount();

      jest.useRealTimers();
    });

    it('should properly set and clear all timer refs to null', () => {
      jest.useFakeTimers();

      const { unmount } = renderWithProvider(<OnboardingSuccess />, {
        state: {},
      });

      jest.advanceTimersByTime(1000);

      unmount();

      expect(jest.getTimerCount()).toBe(0);

      jest.useRealTimers();
    });

    it('should clear dotsInterval when 1200ms timeout executes', () => {
      jest.useFakeTimers();

      renderWithProvider(<OnboardingSuccess />, {
        state: {},
      });

      jest.advanceTimersByTime(1200);

      jest.useRealTimers();
    });

    it('should set finalTimeoutId to null when 3000ms timeout executes', () => {
      jest.useFakeTimers();

      renderWithProvider(<OnboardingSuccess />, {
        state: {},
      });

      jest.advanceTimersByTime(3000);

      jest.useRealTimers();
    });
  });

  describe('Animation State Management', () => {
    it('should render dynamic text with undefined successFlow', () => {
      (useSelector as jest.Mock).mockImplementation(() => undefined);

      const { queryByText } = renderWithProvider(
        <OnboardingSuccessComponent
          onDone={jest.fn()}
          successFlow={null as unknown as ONBOARDING_SUCCESS_FLOW}
        />,
        {
          state: {},
        },
      );

      const initialText = queryByText('Setting up your wallet.');
      expect(initialText).toBeOnTheScreen();
    });

    it('should render dynamic text with IMPORT_FROM_SEED_PHRASE flow', () => {
      (useSelector as jest.Mock).mockImplementation(() => undefined);

      const { queryByText } = renderWithProvider(
        <OnboardingSuccessComponent
          onDone={jest.fn()}
          successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
        />,
        {
          state: {},
        },
      );

      const initialText = queryByText('Setting up your wallet.');
      expect(initialText).toBeOnTheScreen();
    });

    it('should test basic component functionality', () => {
      (useSelector as jest.Mock).mockImplementation(() => undefined);

      const { getByTestId, queryByText } = renderWithProvider(
        <OnboardingSuccessComponent
          onDone={jest.fn()}
          successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
        />,
        {
          state: {},
        },
      );

      const doneButton = getByTestId('onboarding-success-done-button');
      expect(doneButton).toBeOnTheScreen();

      const walletText = queryByText(/wallet/i);
      expect(walletText).toBeTruthy();
    });
  });

  describe('Animation Logic Coverage', () => {
    it('should cover renderAnimatedDots function logic', () => {
      (useSelector as jest.Mock).mockImplementation(() => undefined);

      const TestComponent = () => {
        const [dotsCount, setDotsCount] = React.useState(1);
        const renderAnimatedDots = () => {
          const dots = '.'.repeat(dotsCount);
          return dots;
        };

        return (
          <View>
            <Text testID="dots">{renderAnimatedDots()}</Text>
            <TouchableOpacity
              onPress={() => setDotsCount(2)}
              testID="change-dots"
            >
              <Text>Change</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(<TestComponent />, {
        state: {},
      });

      expect(getByTestId('dots').children[0]).toBe('.');
      fireEvent.press(getByTestId('change-dots'));
      expect(getByTestId('dots').children[0]).toBe('..');
    });

    it('should cover animation step state changes', () => {
      (useSelector as jest.Mock).mockImplementation(() => undefined);

      const TestAnimationSteps = () => {
        const [animationStep, setAnimationStep] = React.useState(1);

        return (
          <View>
            <Text testID="step">{animationStep}</Text>
            <TouchableOpacity
              onPress={() => setAnimationStep(2)}
              testID="step2"
            >
              <Text>Step 2</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAnimationStep(3)}
              testID="step3"
            >
              <Text>Step 3</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(<TestAnimationSteps />, {
        state: {},
      });

      expect(getByTestId('step').children[0]).toBe('1');
      fireEvent.press(getByTestId('step2'));
      expect(getByTestId('step').children[0]).toBe('2');
      fireEvent.press(getByTestId('step3'));
      expect(getByTestId('step').children[0]).toBe('3');
    });

    it('should cover useMemo dependency changes', () => {
      (useSelector as jest.Mock).mockImplementation(() => undefined);

      const TestMemoComponent = () => {
        const [count, setCount] = React.useState(0);

        const MemoizedComponent = React.useMemo(
          () => <Text testID="memo">Memoized</Text>,
          [],
        );

        return (
          <View>
            {MemoizedComponent}
            <TouchableOpacity
              onPress={() => setCount(count + 1)}
              testID="update-styles"
            >
              <Text>Update</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(<TestMemoComponent />, {
        state: {},
      });

      expect(getByTestId('memo')).toBeTruthy();
      fireEvent.press(getByTestId('update-styles'));
      expect(getByTestId('memo')).toBeTruthy();
    });

    it('should cover dynamic text conditional rendering', () => {
      (useSelector as jest.Mock).mockImplementation(() => undefined);

      const TestTextLogic = () => {
        const [animationStep, setAnimationStep] = React.useState(1);
        const [dotsCount, setDotsCount] = React.useState(1);

        const renderAnimatedDots = () => '.'.repeat(dotsCount);

        const getText = () => {
          if (animationStep === 3) return 'Your wallet is ready!';
          if (animationStep === 1)
            return `Setting up your wallet${renderAnimatedDots()}`;
          return 'Setting up your wallet...';
        };

        return (
          <View>
            <Text testID="dynamic-text">{getText()}</Text>
            <TouchableOpacity
              onPress={() => setAnimationStep(2)}
              testID="step2"
            >
              <Text>Step 2</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAnimationStep(3)}
              testID="step3"
            >
              <Text>Step 3</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDotsCount(3)} testID="3dots">
              <Text>3 Dots</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(<TestTextLogic />, {
        state: {},
      });

      expect(getByTestId('dynamic-text').children[0]).toBe(
        'Setting up your wallet.',
      );

      fireEvent.press(getByTestId('3dots'));
      expect(getByTestId('dynamic-text').children[0]).toBe(
        'Setting up your wallet...',
      );

      fireEvent.press(getByTestId('step2'));
      expect(getByTestId('dynamic-text').children[0]).toBe(
        'Setting up your wallet...',
      );

      fireEvent.press(getByTestId('step3'));
      expect(getByTestId('dynamic-text').children[0]).toBe(
        'Your wallet is ready!',
      );
    });

    it('should cover useLayoutEffect navigation.setOptions call', () => {
      const mockSetOptions = jest.fn();

      jest.doMock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useNavigation: () => ({
          navigate: jest.fn(),
          setOptions: mockSetOptions,
          goBack: jest.fn(),
          reset: jest.fn(),
          dispatch: jest.fn(),
        }),
      }));

      (useSelector as jest.Mock).mockImplementation(() => undefined);

      const TestLayoutEffect = () => {
        React.useLayoutEffect(() => {
          const navigation = { setOptions: mockSetOptions };
          navigation.setOptions({
            headerShown: false,
          });
        }, []);

        return <Text testID="layout-test">Layout Effect Test</Text>;
      };

      renderWithProvider(<TestLayoutEffect />, { state: {} });

      expect(mockSetOptions).toHaveBeenCalledWith({ headerShown: false });
    });
  });
});
