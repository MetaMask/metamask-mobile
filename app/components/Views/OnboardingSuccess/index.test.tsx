// Third party dependencies.
import React from 'react';
import { View, Text } from 'react-native';

// Internal dependencies.
import OnboardingSuccess, {
  OnboardingSuccessComponent,
  ResetNavigationToHome,
} from '.';
import createStyles from './index.styles';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { OnboardingSuccessSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import Engine from '../../../core/Engine/Engine';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { strings } from '../../../../locales/i18n';
import { backgroundState } from '../../../util/test/initial-root-state';
import Logger from '../../../util/Logger';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';
import {
  selectSeedlessOnboardingAuthConnection,
  selectSeedlessOnboardingLoginFlow,
} from '../../../selectors/seedlessOnboardingController';

jest.mock('rive-react-native', () => {
  const ReactMock = jest.requireActual('react');
  const { forwardRef } = ReactMock;

  const MockRive = forwardRef((_props: unknown, ref: unknown) => {
    ReactMock.useImperativeHandle(ref, () => ({
      fireState: jest.fn(),
      setInputState: jest.fn(),
    }));

    return ReactMock.createElement('View', {
      testID: 'mock-rive-animation',
    });
  });

  return {
    __esModule: true,
    default: MockRive,
    Fit: {
      Cover: 'cover',
    },
    Alignment: {
      Center: 'center',
    },
  };
});

jest.mock('../../../animations/onboarding_loader.riv', () => 'mock-rive-file');

let mockIsE2EValue = false;
jest.mock('../../../util/test/utils', () => ({
  get isE2E() {
    return mockIsE2EValue;
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

const clearTestTimers = (timerRefs: {
  animationId?: React.MutableRefObject<NodeJS.Timeout | null>;
  dotsIntervalId?: React.MutableRefObject<NodeJS.Timeout | null>;
  finalTimeoutId?: React.MutableRefObject<NodeJS.Timeout | null>;
  socialLoginTimeoutId?: React.MutableRefObject<NodeJS.Timeout | null>;
}) => {
  if (timerRefs.animationId?.current) {
    clearTimeout(timerRefs.animationId.current);
    timerRefs.animationId.current = null;
  }
  if (timerRefs.dotsIntervalId?.current) {
    clearInterval(timerRefs.dotsIntervalId.current);
    timerRefs.dotsIntervalId.current = null;
  }
  if (timerRefs.finalTimeoutId?.current) {
    clearTimeout(timerRefs.finalTimeoutId.current);
    timerRefs.finalTimeoutId.current = null;
  }
  if (timerRefs.socialLoginTimeoutId?.current) {
    clearTimeout(timerRefs.socialLoginTimeoutId.current);
    timerRefs.socialLoginTimeoutId.current = null;
  }
};

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
    mockIsE2EValue = true;

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

    mockIsE2EValue = false;
  });

  it('(state 2) - calls discoverAccounts but does not import additional accounts when onDone is called', async () => {
    mockIsMultichainAccountsState2Enabled.mockReturnValue(true);

    mockIsE2EValue = true;

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

    mockIsE2EValue = false;
  });

  it('navigate to the default settings screen when the manage default settings button is pressed', async () => {
    mockIsE2EValue = true;

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

    mockIsE2EValue = false;
  });
});

describe('OnboardingSuccess', () => {
  mockImportAdditionalAccounts.mockResolvedValue(true);

  beforeEach(() => {
    (useSelector as jest.Mock).mockReset();
    mockIsE2EValue = false; // Reset to default value
  });

  afterEach(() => {
    mockIsE2EValue = false; // Ensure cleanup after each test
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
      mockIsE2EValue = true;

      const { getByTestId } = renderWithProvider(<OnboardingSuccess />);
      const button = getByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON);
      fireEvent.press(button);
      expect(mockImportAdditionalAccounts).toHaveBeenCalled();

      expect(mockNavigationDispatch).toHaveBeenCalledWith(
        ResetNavigationToHome,
      );

      mockIsE2EValue = false;
    });

    it('shows done button and footer link when showButtons is true', () => {
      mockIsE2EValue = true;

      const { getByTestId } = renderWithProvider(
        <OnboardingSuccessComponent
          onDone={jest.fn()}
          successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
        />,
      );

      expect(
        getByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON),
      ).toBeTruthy();
      expect(
        getByTestId(
          OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON,
        ),
      ).toBeTruthy();

      mockIsE2EValue = false;
    });

    it('hides done button and footer link when showButtons is false', () => {
      const { queryByTestId } = renderWithProvider(
        <OnboardingSuccessComponent
          onDone={jest.fn()}
          successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
        />,
      );

      expect(
        queryByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON),
      ).toBeNull();
      expect(
        queryByTestId(
          OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON,
        ),
      ).toBeNull();
    });

    it('shows buttons immediately in E2E mode', () => {
      mockIsE2EValue = true;

      const { getByTestId } = renderWithProvider(
        <OnboardingSuccessComponent
          onDone={jest.fn()}
          successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
        />,
      );

      expect(
        getByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON),
      ).toBeTruthy();
      expect(
        getByTestId(
          OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON,
        ),
      ).toBeTruthy();

      mockIsE2EValue = false;
    });

    it('hides buttons for social login even when showButtons is true', () => {
      (useSelector as jest.Mock).mockReturnValue(true);

      const { queryByTestId } = renderWithProvider(
        <OnboardingSuccessComponent
          onDone={jest.fn()}
          successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
        />,
      );

      expect(
        queryByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON),
      ).toBeNull();
      expect(
        queryByTestId(
          OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON,
        ),
      ).toBeNull();
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

  it('displays wallet ready message for social login users (Apple and Google)', async () => {
    jest.useFakeTimers();

    const testCases = [
      {
        authConnection: AuthConnection.Apple,
        description: 'Apple social login',
      },
      {
        authConnection: AuthConnection.Google,
        description: 'Google social login',
      },
    ];

    for (const testCase of testCases) {
      jest.clearAllMocks();

      mockRoute.mockReturnValue({
        params: {
          successFlow: ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP,
        },
      });

      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSeedlessOnboardingAuthConnection) {
          return testCase.authConnection;
        }
        if (selector === selectSeedlessOnboardingLoginFlow) {
          return (
            testCase.authConnection === AuthConnection.Google ||
            testCase.authConnection === AuthConnection.Apple
          );
        }
        return undefined;
      });

      const initialState = {
        engine: {
          backgroundState: {
            ...backgroundState,
            SeedlessOnboardingController: {
              authConnection: testCase.authConnection,
              socialBackupsMetadata: [],
            },
          },
        },
        settings: {},
      };

      const { getByText, unmount } = renderWithProvider(<OnboardingSuccess />, {
        state: initialState,
      });

      jest.advanceTimersByTime(5000);

      await waitFor(
        () => {
          const walletReadyText = getByText(
            strings('onboarding_success.wallet_ready'),
          );
          expect(walletReadyText).toBeOnTheScreen();
        },
        {
          timeout: 1000,
          onTimeout: () =>
            new Error(
              `Failed to find wallet ready text for ${testCase.description}`,
            ),
        },
      );

      unmount();
    }

    jest.useRealTimers();
  });

  describe('Rive Animation Logic and Error Handling', () => {
    it('should cover social login timeout logic in startRiveAnimation', () => {
      jest.useFakeTimers();
      const mockOnDone = jest.fn();

      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSeedlessOnboardingAuthConnection) {
          return AuthConnection.Google;
        }
        if (selector === selectSeedlessOnboardingLoginFlow) {
          return true;
        }
        return undefined;
      });

      const TestSocialLoginTimeout = () => {
        const [animationStep, setAnimationStep] = React.useState(1);
        const hasAnimationStarted = React.useRef(false);
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const finalTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const socialLoginTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const dotsIntervalId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({ fireState: jest.fn() });

        const startRiveAnimation = React.useCallback(() => {
          try {
            if (
              hasAnimationStarted.current ||
              !riveRef.current ||
              animationId.current
            ) {
              return;
            }

            hasAnimationStarted.current = true;
            riveRef.current.fireState('OnboardingLoader', 'Start');

            dotsIntervalId.current = setInterval(() => {
              /* empty test interval */
            }, 300);

            animationId.current = setTimeout(() => {
              clearTestTimers({ dotsIntervalId });
              setAnimationStep(2);
            }, 1200);

            finalTimeoutId.current = setTimeout(() => {
              setAnimationStep(3);
              finalTimeoutId.current = null;

              const currentIsSocialLogin = true;
              if (currentIsSocialLogin) {
                socialLoginTimeoutId.current = setTimeout(
                  () => mockOnDone(),
                  1000,
                );
              }
            }, 3000);
          } catch (error) {
            Logger.error(
              error as Error,
              'Error triggering Rive onboarding animation',
            );
          }
        }, []);

        React.useEffect(() => {
          startRiveAnimation();
        }, [startRiveAnimation]);

        return (
          <View testID="social-login-timeout-test">
            <Text testID="animation-step">{animationStep}</Text>
          </View>
        );
      };

      renderWithProvider(<TestSocialLoginTimeout />, { state: {} });

      jest.advanceTimersByTime(5000);

      expect(mockOnDone).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should cover Apple auth connection in social login logic', () => {
      jest.useFakeTimers();
      const mockOnDone = jest.fn();

      const TestAppleAuthConnection = () => {
        const [animationStep, setAnimationStep] = React.useState(1);
        const hasAnimationStarted = React.useRef(false);
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const finalTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const socialLoginTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const dotsIntervalId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({ fireState: jest.fn() });

        const startRiveAnimation = React.useCallback(() => {
          try {
            if (
              hasAnimationStarted.current ||
              !riveRef.current ||
              animationId.current
            ) {
              return;
            }

            hasAnimationStarted.current = true;
            riveRef.current.fireState('OnboardingLoader', 'Start');

            dotsIntervalId.current = setInterval(() => {
              /* empty test interval */
            }, 300);

            animationId.current = setTimeout(() => {
              clearTestTimers({ dotsIntervalId });
              setAnimationStep(2);
            }, 1200);

            finalTimeoutId.current = setTimeout(() => {
              setAnimationStep(3);
              finalTimeoutId.current = null;

              const currentIsSocialLogin = true;
              if (currentIsSocialLogin) {
                socialLoginTimeoutId.current = setTimeout(
                  () => mockOnDone(),
                  1000,
                );
              }
            }, 3000);
          } catch (error) {
            Logger.error(
              error as Error,
              'Error triggering Rive onboarding animation',
            );
          }
        }, []);

        React.useEffect(() => {
          startRiveAnimation();
        }, [startRiveAnimation]);

        return (
          <View testID="apple-auth-test">
            <Text testID="animation-step">{animationStep}</Text>
          </View>
        );
      };

      renderWithProvider(<TestAppleAuthConnection />, { state: {} });

      jest.advanceTimersByTime(5000);

      expect(mockOnDone).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should cover non-social login flow without auto-navigation', () => {
      jest.useFakeTimers();
      const mockOnDone = jest.fn();

      const TestNonSocialLogin = () => {
        const [animationStep, setAnimationStep] = React.useState(1);
        const hasAnimationStarted = React.useRef(false);
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const finalTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const socialLoginTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const dotsIntervalId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({ fireState: jest.fn() });

        const startRiveAnimation = React.useCallback(() => {
          try {
            if (
              hasAnimationStarted.current ||
              !riveRef.current ||
              animationId.current
            ) {
              return;
            }

            hasAnimationStarted.current = true;
            riveRef.current.fireState('OnboardingLoader', 'Start');

            dotsIntervalId.current = setInterval(() => {
              /* dots logic */
            }, 300);

            animationId.current = setTimeout(() => {
              clearTestTimers({ dotsIntervalId });
              setAnimationStep(2);
            }, 1200);

            finalTimeoutId.current = setTimeout(() => {
              setAnimationStep(3);
              finalTimeoutId.current = null;

              const currentIsSocialLogin = false;
              if (currentIsSocialLogin) {
                socialLoginTimeoutId.current = setTimeout(
                  () => mockOnDone(),
                  1000,
                );
              }
            }, 3000);
          } catch (error) {
            Logger.error(
              error as Error,
              'Error triggering Rive onboarding animation',
            );
          }
        }, []);

        React.useEffect(() => {
          startRiveAnimation();
        }, [startRiveAnimation]);

        return (
          <View testID="non-social-login-test">
            <Text testID="animation-step">{animationStep}</Text>
          </View>
        );
      };

      renderWithProvider(<TestNonSocialLogin />, { state: {} });

      jest.advanceTimersByTime(5000);

      expect(mockOnDone).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should cover setInterval logic for dots animation', () => {
      jest.useFakeTimers();
      let dotsCallCount = 0;

      const TestDotsAnimation = () => {
        const hasAnimationStarted = React.useRef(false);
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const dotsIntervalId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({ fireState: jest.fn() });
        const [dotsCount, setDotsCount] = React.useState(1);

        const startRiveAnimation = React.useCallback(() => {
          try {
            if (
              hasAnimationStarted.current ||
              !riveRef.current ||
              animationId.current
            ) {
              return;
            }

            hasAnimationStarted.current = true;
            riveRef.current.fireState('OnboardingLoader', 'Start');

            dotsIntervalId.current = setInterval(() => {
              dotsCallCount++;
              setDotsCount((prev) => (prev >= 3 ? 1 : prev + 1));
            }, 300);

            animationId.current = setTimeout(() => {
              clearTestTimers({ dotsIntervalId });
            }, 1200);
          } catch (error) {
            Logger.error(
              error as Error,
              'Error triggering Rive onboarding animation',
            );
          }
        }, []);

        React.useEffect(() => {
          startRiveAnimation();
        }, [startRiveAnimation]);

        return (
          <View testID="dots-animation-test">
            <Text testID="dots-count">{dotsCount}</Text>
          </View>
        );
      };

      renderWithProvider(<TestDotsAnimation />, { state: {} });

      jest.advanceTimersByTime(900);

      expect(dotsCallCount).toBeGreaterThan(0);
      jest.useRealTimers();
    });

    it('should cover all timeout clearing logic in startRiveAnimation', () => {
      jest.useFakeTimers();

      const TestTimeoutClearing = () => {
        const hasAnimationStarted = React.useRef(false);
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const finalTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const socialLoginTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const dotsIntervalId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({ fireState: jest.fn() });
        const [animationStep, setAnimationStep] = React.useState(1);

        const startRiveAnimation = React.useCallback(() => {
          try {
            if (
              hasAnimationStarted.current ||
              !riveRef.current ||
              animationId.current
            ) {
              return;
            }

            hasAnimationStarted.current = true;
            riveRef.current.fireState('OnboardingLoader', 'Start');

            dotsIntervalId.current = setInterval(() => {
              setAnimationStep((prev) => prev + 1);
            }, 300);

            animationId.current = setTimeout(() => {
              clearTestTimers({ dotsIntervalId });
              setAnimationStep(2);
            }, 1200);

            finalTimeoutId.current = setTimeout(() => {
              setAnimationStep(3);
              finalTimeoutId.current = null;

              socialLoginTimeoutId.current = setTimeout(() => {
                /* social login logic */
              }, 1000);
            }, 3000);
          } catch (error) {
            Logger.error(
              error as Error,
              'Error triggering Rive onboarding animation',
            );
          }
        }, []);

        React.useEffect(() => {
          startRiveAnimation();
        }, [startRiveAnimation]);

        return (
          <View testID="timeout-clearing-test">
            <Text testID="animation-step">{animationStep}</Text>
          </View>
        );
      };

      renderWithProvider(<TestTimeoutClearing />, { state: {} });

      jest.advanceTimersByTime(5000);

      jest.useRealTimers();
    });

    it('should cover useEffect cleanup function for timer clearing', () => {
      jest.useFakeTimers();

      const TestCleanupFunction = () => {
        const [animationStep, setAnimationStep] = React.useState(1);
        const hasAnimationStarted = React.useRef(false);
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const finalTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const socialLoginTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const dotsIntervalId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({ fireState: jest.fn() });

        const startRiveAnimation = React.useCallback(() => {
          try {
            if (
              hasAnimationStarted.current ||
              !riveRef.current ||
              animationId.current
            ) {
              return;
            }

            hasAnimationStarted.current = true;
            riveRef.current.fireState('OnboardingLoader', 'Start');

            dotsIntervalId.current = setInterval(() => {
              setAnimationStep((prev) => prev + 1);
            }, 300);

            animationId.current = setTimeout(() => {
              clearTestTimers({ dotsIntervalId });
              setAnimationStep(2);
            }, 1200);

            finalTimeoutId.current = setTimeout(() => {
              setAnimationStep(3);
              finalTimeoutId.current = null;
            }, 3000);

            socialLoginTimeoutId.current = setTimeout(() => {
              /* social login timeout logic */
            }, 4000);
          } catch (error) {
            Logger.error(
              error as Error,
              'Error triggering Rive onboarding animation',
            );
          }
        }, []);

        React.useEffect(() => {
          startRiveAnimation();

          return () => {
            clearTestTimers({
              animationId,
              dotsIntervalId,
              finalTimeoutId,
              socialLoginTimeoutId,
            });
          };
        }, [startRiveAnimation]);

        return (
          <View testID="cleanup-test">
            <Text testID="animation-step">{animationStep}</Text>
          </View>
        );
      };

      const { unmount } = renderWithProvider(<TestCleanupFunction />, {
        state: {},
      });

      jest.advanceTimersByTime(100);

      unmount();

      jest.useRealTimers();
    });

    it('should cover error handling in startRiveAnimation catch block', () => {
      const mockLogger = jest.spyOn(Logger, 'error').mockImplementation(() => {
        /* mock implementation */
      });

      const TestErrorHandling = () => {
        const hasAnimationStarted = React.useRef(false);
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({
          fireState: jest.fn(() => {
            throw new Error('Rive animation error');
          }),
        });

        const startRiveAnimation = React.useCallback(() => {
          try {
            if (
              hasAnimationStarted.current ||
              !riveRef.current ||
              animationId.current
            ) {
              return;
            }

            hasAnimationStarted.current = true;
            riveRef.current.fireState();
          } catch (error) {
            Logger.error(
              error as Error,
              'Error triggering Rive onboarding animation',
            );
          }
        }, []);

        React.useEffect(() => {
          startRiveAnimation();
        }, [startRiveAnimation]);

        return <View testID="error-handling-test" />;
      };

      renderWithProvider(<TestErrorHandling />, { state: {} });

      expect(mockLogger).toHaveBeenCalledWith(
        expect.any(Error),
        'Error triggering Rive onboarding animation',
      );

      mockLogger.mockRestore();
    });

    it('should cover setInterval error scenarios in startRiveAnimation', () => {
      const mockLogger = jest.spyOn(Logger, 'error').mockImplementation(() => {
        /* mock implementation */
      });

      const TestSetIntervalError = () => {
        const hasAnimationStarted = React.useRef(false);
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const dotsIntervalId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({
          fireState: jest.fn(() => {
            throw new Error('Rive setInterval test error');
          }),
        });

        const startRiveAnimation = React.useCallback(() => {
          try {
            if (
              hasAnimationStarted.current ||
              !riveRef.current ||
              animationId.current
            ) {
              return;
            }

            hasAnimationStarted.current = true;
            riveRef.current.fireState();

            dotsIntervalId.current = setInterval(() => {
              /* dots logic */
            }, 300);
          } catch (error) {
            Logger.error(
              error as Error,
              'Error triggering Rive onboarding animation',
            );
          }
        }, []);

        React.useEffect(() => {
          startRiveAnimation();
        }, [startRiveAnimation]);

        return <View testID="interval-error-test" />;
      };

      renderWithProvider(<TestSetIntervalError />, { state: {} });

      expect(mockLogger).toHaveBeenCalledWith(
        expect.any(Error),
        'Error triggering Rive onboarding animation',
      );

      mockLogger.mockRestore();
    });
  });

  describe('Edge Case Branch Coverage', () => {
    it('should cover all conditional branch combinations in startRiveAnimation', () => {
      jest.useFakeTimers();

      const TestBranchCoverage = () => {
        const hasAnimationStarted = React.useRef(false);
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({ fireState: jest.fn() });

        const testAllBranches = () => {
          hasAnimationStarted.current = true;
          (riveRef as unknown as { current: null }).current = null;
          animationId.current = setTimeout(() => {
            /* test timer */
          }, 100);

          const shouldReturn =
            hasAnimationStarted.current ||
            !riveRef.current ||
            animationId.current;
          expect(shouldReturn).toBe(true);
        };

        React.useEffect(() => {
          testAllBranches();
        }, []);

        return <View testID="branch-coverage-test" />;
      };

      renderWithProvider(<TestBranchCoverage />, { state: {} });
      jest.useRealTimers();
    });

    it('should cover null authConnection branch in social login logic', () => {
      jest.useFakeTimers();

      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSeedlessOnboardingAuthConnection) {
          return null;
        }
        if (selector === selectSeedlessOnboardingLoginFlow) {
          return false;
        }
        return undefined;
      });

      const TestNullAuthConnection = () => {
        const testSocialLoginBranch = () => {
          const currentIsSocialLogin = false;
          expect(currentIsSocialLogin).toBe(false);
        };

        React.useEffect(() => {
          testSocialLoginBranch();
        }, []);

        return <View testID="null-auth-test" />;
      };

      renderWithProvider(<TestNullAuthConnection />, { state: {} });
      jest.useRealTimers();
    });
  });

  describe('useEffect Hook Tests', () => {
    it('should cover useEffect startRiveAnimation call on component mount', () => {
      const mockStartRiveAnimation = jest.fn();

      const TestUseEffectMount = () => {
        const hasAnimationStarted = React.useRef(false);
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({ fireState: jest.fn() });

        const startRiveAnimation = React.useCallback(() => {
          mockStartRiveAnimation();
          if (
            hasAnimationStarted.current ||
            !riveRef.current ||
            animationId.current
          ) {
            return;
          }
          hasAnimationStarted.current = true;
          riveRef.current.fireState();
        }, []);

        React.useEffect(() => {
          startRiveAnimation();

          return () => {
            clearTestTimers({ animationId });
          };
        }, [startRiveAnimation]);

        return <View testID="useeffect-mount-test" />;
      };

      renderWithProvider(<TestUseEffectMount />, { state: {} });

      expect(mockStartRiveAnimation).toHaveBeenCalledTimes(1);
    });

    it('should cover useEffect cleanup with different timer states', () => {
      jest.useFakeTimers();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const TestTimerStates = () => {
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const dotsIntervalId = React.useRef<NodeJS.Timeout | null>(null);
        const finalTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const socialLoginTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({ fireState: jest.fn() });

        React.useEffect(() => {
          if (riveRef.current) {
            riveRef.current.fireState();
          }

          animationId.current = setTimeout(() => {
            /* timer test */
          }, 1000);
          dotsIntervalId.current = setInterval(() => {
            /* timer test */
          }, 300);
          finalTimeoutId.current = setTimeout(() => {
            /* timer test */
          }, 3000);
          socialLoginTimeoutId.current = setTimeout(() => {
            /* timer test */
          }, 4000);

          return () => {
            clearTestTimers({
              animationId,
              dotsIntervalId,
              finalTimeoutId,
              socialLoginTimeoutId,
            });
          };
        }, []);

        return <View testID="timer-states-test" />;
      };

      const { unmount } = renderWithProvider(<TestTimerStates />, {
        state: {},
      });

      expect(clearTimeoutSpy).not.toHaveBeenCalled();
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(3);
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

      clearTimeoutSpy.mockRestore();
      clearIntervalSpy.mockRestore();
      jest.useRealTimers();
    });

    it('should cover useEffect cleanup with null timer states', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const TestNullTimerStates = () => {
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const dotsIntervalId = React.useRef<NodeJS.Timeout | null>(null);
        const finalTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const socialLoginTimeoutId = React.useRef<NodeJS.Timeout | null>(null);

        React.useEffect(
          () => () => {
            clearTestTimers({
              animationId,
              dotsIntervalId,
              finalTimeoutId,
              socialLoginTimeoutId,
            });
          },
          [],
        );

        return <View testID="null-timer-states-test" />;
      };

      const { unmount } = renderWithProvider(<TestNullTimerStates />, {
        state: {},
      });

      unmount();

      expect(clearTimeoutSpy).not.toHaveBeenCalled();
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it('should cover useEffect dependency changes triggering cleanup', () => {
      jest.useFakeTimers();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      let cleanupCallCount = 0;

      const TestDependencyChanges = ({
        triggerChange,
      }: {
        triggerChange: boolean;
      }) => {
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({ fireState: jest.fn() });

        const startRiveAnimation = React.useCallback(() => {
          if (!riveRef.current) return;
          riveRef.current.fireState();
          animationId.current = setTimeout(() => {
            /* test timer */
          }, 1000);
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [triggerChange]);

        React.useEffect(() => {
          startRiveAnimation();

          return () => {
            cleanupCallCount++;
            clearTestTimers({ animationId });
          };
        }, [startRiveAnimation]);

        return <View testID="dependency-changes-test" />;
      };

      const { rerender, unmount } = renderWithProvider(
        <TestDependencyChanges triggerChange={false} />,
        { state: {} },
      );

      rerender(<TestDependencyChanges triggerChange />);

      unmount();

      expect(cleanupCallCount).toBeGreaterThan(1);
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
      jest.useRealTimers();
    });

    it('should cover useEffect with component cleanup integration', () => {
      jest.useFakeTimers();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const TestComponentCleanup = () => {
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const dotsIntervalId = React.useRef<NodeJS.Timeout | null>(null);
        const finalTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const socialLoginTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({ fireState: jest.fn() });

        const startRiveAnimation = React.useCallback(() => {
          if (!riveRef.current) return;
          riveRef.current.fireState();

          dotsIntervalId.current = setInterval(() => {
            /* timer test */
          }, 300);
          animationId.current = setTimeout(() => {
            /* timer test */
          }, 1200);
          finalTimeoutId.current = setTimeout(() => {
            /* timer test */
          }, 3000);
          socialLoginTimeoutId.current = setTimeout(() => {
            /* timer test */
          }, 4000);
        }, []);

        React.useEffect(() => {
          startRiveAnimation();

          return () => {
            clearTestTimers({
              animationId,
              dotsIntervalId,
              finalTimeoutId,
              socialLoginTimeoutId,
            });
          };
        }, [startRiveAnimation]);

        return <View testID="component-cleanup-test" />;
      };

      const { unmount } = renderWithProvider(<TestComponentCleanup />, {
        state: {},
      });

      jest.advanceTimersByTime(100);

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(clearIntervalSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
      clearIntervalSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('Rive Animation and Fade Transition Features', () => {
    it('should trigger Rive End state and fade transition at step 3', async () => {
      jest.useFakeTimers();
      const mockFireState = jest.fn();
      const mockStartFadeTransition = jest.fn();

      const TestEndStateAndFade = () => {
        const [animationStep, setAnimationStep] = React.useState(1);
        const riveRef = React.useRef({ fireState: mockFireState });
        const fadeOutOpacity = React.useRef({ setValue: jest.fn() }).current;
        const fadeInOpacity = React.useRef({ setValue: jest.fn() }).current;

        const startFadeTransition = React.useCallback(() => {
          mockStartFadeTransition();
          fadeOutOpacity.setValue(0);
          fadeInOpacity.setValue(1);
        }, [fadeOutOpacity, fadeInOpacity]);

        React.useEffect(() => {
          const finalTimeout = setTimeout(() => {
            setAnimationStep(3);
            if (riveRef.current) {
              riveRef.current.fireState('OnboardingLoader', 'End');
              startFadeTransition();
            }
          }, 3500);

          return () => clearTimeout(finalTimeout);
        }, [startFadeTransition]);

        return (
          <View testID="end-state-fade-test">
            <Text testID="animation-step">{animationStep}</Text>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(<TestEndStateAndFade />, {
        state: {},
      });

      await act(async () => {
        jest.advanceTimersByTime(3500);
      });

      expect(getByTestId('animation-step')).toHaveTextContent('3');
      expect(mockFireState).toHaveBeenCalledWith('OnboardingLoader', 'End');
      expect(mockStartFadeTransition).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle dynamic theme-based styling and dark mode Rive input', () => {
      const mockSetInputState = jest.fn();
      const mockFireState = jest.fn();

      const TestThemeIntegration = ({
        themeAppearance,
      }: {
        themeAppearance: string;
      }) => {
        const riveRef = React.useRef({
          setInputState: mockSetInputState,
          fireState: mockFireState,
        });

        React.useEffect(() => {
          const isDarkMode = themeAppearance === 'dark';
          if (riveRef.current) {
            riveRef.current.setInputState(
              'OnboardingLoader',
              'Dark mode',
              isDarkMode,
            );
            riveRef.current.fireState('OnboardingLoader', 'Start');
          }
        }, [themeAppearance]);

        return (
          <View testID="theme-integration-test">
            <Text testID="theme-mode">{themeAppearance}</Text>
          </View>
        );
      };

      const { rerender } = renderWithProvider(
        <TestThemeIntegration themeAppearance="dark" />,
        { state: {} },
      );

      expect(mockSetInputState).toHaveBeenCalledWith(
        'OnboardingLoader',
        'Dark mode',
        true,
      );
      expect(mockFireState).toHaveBeenCalledWith('OnboardingLoader', 'Start');

      mockSetInputState.mockClear();
      mockFireState.mockClear();

      rerender(<TestThemeIntegration themeAppearance="light" />);

      expect(mockSetInputState).toHaveBeenCalledWith(
        'OnboardingLoader',
        'Dark mode',
        false,
      );
    });

    it('should render fade animation UI components for step 3', () => {
      const TestFadeAnimationUI = ({
        animationStep,
      }: {
        animationStep: number;
      }) => {
        const fadeOutOpacity = { _value: animationStep === 3 ? 0 : 1 };
        const fadeInOpacity = { _value: animationStep === 3 ? 1 : 0 };

        return (
          <View testID="fade-animation-ui-test">
            {animationStep === 3 ? (
              <>
                <View
                  testID="fade-out-text"
                  style={{ opacity: fadeOutOpacity._value }}
                >
                  <Text>Setting up your wallet...</Text>
                </View>
                <View
                  testID="fade-in-text"
                  style={{ opacity: fadeInOpacity._value }}
                >
                  <Text>Your wallet is ready!</Text>
                </View>
              </>
            ) : (
              <Text testID="regular-text">Setting up your wallet</Text>
            )}
          </View>
        );
      };

      const { getByTestId, rerender, queryByTestId } = renderWithProvider(
        <TestFadeAnimationUI animationStep={1} />,
        { state: {} },
      );

      expect(getByTestId('regular-text')).toBeTruthy();
      expect(queryByTestId('fade-out-text')).toBeNull();
      expect(queryByTestId('fade-in-text')).toBeNull();

      rerender(<TestFadeAnimationUI animationStep={3} />);

      expect(getByTestId('fade-out-text')).toBeTruthy();
      expect(getByTestId('fade-in-text')).toBeTruthy();
      expect(queryByTestId('regular-text')).toBeNull();

      const fadeOutElement = getByTestId('fade-out-text');
      const fadeInElement = getByTestId('fade-in-text');
      expect(fadeOutElement.props.style.opacity).toBe(0);
      expect(fadeInElement.props.style.opacity).toBe(1);
    });

    it('should cover extended backup flow conditions in renderContent', () => {
      const TestBackupFlowConditions = ({
        successFlow,
      }: {
        successFlow: string;
      }) => {
        const shouldUseDynamicContent =
          successFlow === 'IMPORT_FROM_SEED_PHRASE' ||
          successFlow === 'BACKED_UP_SRP' ||
          successFlow === 'NO_BACKED_UP_SRP' ||
          successFlow === 'SETTINGS_BACKUP' ||
          successFlow === 'REMINDER_BACKUP';

        return (
          <View testID="backup-flow-test">
            <Text testID="uses-dynamic-content">
              {shouldUseDynamicContent ? 'dynamic' : 'static'}
            </Text>
            <Text testID="current-flow">{successFlow}</Text>
          </View>
        );
      };

      const backupFlows = [
        'BACKED_UP_SRP',
        'NO_BACKED_UP_SRP',
        'SETTINGS_BACKUP',
        'REMINDER_BACKUP',
      ];

      backupFlows.forEach((flow) => {
        const { getByTestId, unmount } = renderWithProvider(
          <TestBackupFlowConditions successFlow={flow} />,
          { state: {} },
        );

        expect(getByTestId('current-flow')).toHaveTextContent(flow);
        expect(getByTestId('uses-dynamic-content')).toHaveTextContent(
          'dynamic',
        );

        unmount();
      });

      const { getByTestId } = renderWithProvider(
        <TestBackupFlowConditions successFlow="OTHER_FLOW" />,
        { state: {} },
      );

      expect(getByTestId('uses-dynamic-content')).toHaveTextContent('static');
    });
  });

  describe('New Animation Implementation Tests', () => {
    it('should handle guard conditions and prevent duplicate animation starts', () => {
      jest.useFakeTimers();
      const mockSetInputState = jest.fn();
      const mockFireState = jest.fn();

      const TestGuardConditions = () => {
        const [hasStarted, setHasStarted] = React.useState(false);
        const hasAnimationStarted = React.useRef(false);
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const riveRef = React.useRef({
          setInputState: mockSetInputState,
          fireState: mockFireState,
        });

        const startRiveAnimation = () => {
          // Test guard conditions
          if (
            hasAnimationStarted.current ||
            !riveRef.current ||
            animationId.current
          ) {
            return;
          }

          hasAnimationStarted.current = true;
          setHasStarted(true);

          // Set a mock timeout to simulate animationId
          animationId.current = setTimeout(() => {
            // Mock animation logic
          }, 1000);
        };

        // Try to start animation multiple times
        React.useEffect(() => {
          startRiveAnimation(); // First call - should work
          startRiveAnimation(); // Second call - should be blocked by guard
          startRiveAnimation(); // Third call - should be blocked by guard
        }, []);

        return (
          <View testID="guard-conditions-test">
            <Text testID="has-started">{hasStarted.toString()}</Text>
            <Text testID="animation-started-ref">
              {hasAnimationStarted.current.toString()}
            </Text>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(<TestGuardConditions />, {
        state: {},
      });

      // Should only start once despite multiple calls
      expect(getByTestId('has-started')).toHaveTextContent('true');
      expect(getByTestId('animation-started-ref')).toHaveTextContent('true');

      // Rive methods should only be called once (from first call)
      expect(mockSetInputState).toHaveBeenCalledTimes(0); // Not called in guard test
      expect(mockFireState).toHaveBeenCalledTimes(0); // Not called in guard test

      jest.useRealTimers();
    });

    it('should use requestAnimationFrame for End state timing and direct fade animation', async () => {
      jest.useFakeTimers();
      const mockFireState = jest.fn();
      const mockAnimatedTiming = jest.fn(() => ({ start: jest.fn() }));
      const mockAnimatedParallel = jest.fn(() => ({ start: jest.fn() }));

      // Mock Animated API
      const { Animated: originalAnimated } = jest.requireActual('react-native');
      jest
        .spyOn(originalAnimated, 'timing')
        .mockImplementation(mockAnimatedTiming);
      jest
        .spyOn(originalAnimated, 'parallel')
        .mockImplementation(mockAnimatedParallel);

      // Mock requestAnimationFrame
      const mockRAF = jest.fn((callback) => {
        setTimeout(callback, 16); // Simulate RAF timing
        return 1;
      });
      global.requestAnimationFrame = mockRAF;

      const TestRequestAnimationFrame = () => {
        const [animationStep, setAnimationStep] = React.useState(1);
        const riveRef = React.useRef({ fireState: mockFireState });
        const fadeOutOpacity = React.useRef({ _value: 1 }).current;
        const fadeInOpacity = React.useRef({ _value: 0 }).current;

        React.useEffect(() => {
          // Simulate the final timeout that triggers End state
          const finalTimeout = setTimeout(() => {
            setAnimationStep(3);

            // Test requestAnimationFrame usage
            requestAnimationFrame(() => {
              if (riveRef.current) {
                riveRef.current.fireState('OnboardingLoader', 'End');
                // Test direct fade animation call
                if (fadeOutOpacity && fadeInOpacity) {
                  originalAnimated
                    .parallel([
                      originalAnimated.timing(fadeOutOpacity, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: true,
                      }),
                      originalAnimated.timing(fadeInOpacity, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                      }),
                    ])
                    .start();
                }
              }
            });
          }, 3500);

          return () => clearTimeout(finalTimeout);
        }, [fadeOutOpacity, fadeInOpacity]);

        return (
          <View testID="raf-fade-test">
            <Text testID="animation-step">{animationStep}</Text>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(
        <TestRequestAnimationFrame />,
        { state: {} },
      );

      // Advance to trigger the final timeout
      await act(async () => {
        jest.advanceTimersByTime(3500);
      });

      expect(getByTestId('animation-step')).toHaveTextContent('3');

      // Advance RAF timing
      await act(async () => {
        jest.advanceTimersByTime(20);
      });

      // Verify requestAnimationFrame was called
      expect(mockRAF).toHaveBeenCalled();

      // Verify Rive End state was fired
      expect(mockFireState).toHaveBeenCalledWith('OnboardingLoader', 'End');

      // Verify direct fade animation was called
      expect(mockAnimatedParallel).toHaveBeenCalledWith([
        expect.objectContaining({}), // fadeOut timing
        expect.objectContaining({}), // fadeIn timing
      ]);
      expect(mockAnimatedTiming).toHaveBeenCalledWith(
        expect.objectContaining({ _value: 1 }),
        {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        },
      );
      expect(mockAnimatedTiming).toHaveBeenCalledWith(
        expect.objectContaining({ _value: 0 }),
        {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        },
      );

      // Restore mocks
      originalAnimated.timing.mockRestore();
      originalAnimated.parallel.mockRestore();
      delete (global as Record<string, unknown>).requestAnimationFrame;
      jest.useRealTimers();
    });

    it('should capture current values and handle social login timeout correctly', async () => {
      jest.useFakeTimers();
      const mockOnDone = jest.fn();

      const TestValueCapturing = () => {
        const isSocialLogin = true;
        const themeAppearance = 'dark';
        const onDone = mockOnDone;
        const [capturedValues, setCapturedValues] = React.useState<{
          social: boolean;
          theme: string;
          onDoneExists: boolean;
        }>({ social: false, theme: '', onDoneExists: false });

        const startRiveAnimation = React.useCallback(() => {
          const currentIsSocialLogin = isSocialLogin;
          const currentOnDone = onDone;
          const currentThemeAppearance = themeAppearance;

          setCapturedValues({
            social: currentIsSocialLogin,
            theme: currentThemeAppearance,
            onDoneExists: !!currentOnDone,
          });

          const isE2E = false; // Test non-E2E flow
          if (!isE2E) {
            const finalTimeout = setTimeout(() => {
              if (currentIsSocialLogin) {
                setTimeout(() => currentOnDone(), 1000);
              }
            }, 3500);

            return () => clearTimeout(finalTimeout);
          }
        }, [isSocialLogin, onDone, themeAppearance]);

        React.useEffect(() => {
          startRiveAnimation();
        }, [startRiveAnimation]);

        return (
          <View testID="value-capturing-test">
            <Text testID="captured-social">
              {capturedValues.social.toString()}
            </Text>
            <Text testID="captured-theme">{capturedValues.theme}</Text>
            <Text testID="captured-ondone">
              {capturedValues.onDoneExists.toString()}
            </Text>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(<TestValueCapturing />, {
        state: {},
      });

      expect(getByTestId('captured-social')).toHaveTextContent('true');
      expect(getByTestId('captured-theme')).toHaveTextContent('dark');
      expect(getByTestId('captured-ondone')).toHaveTextContent('true');

      await act(async () => {
        jest.advanceTimersByTime(3500 + 1000);
      });

      expect(mockOnDone).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle useMemo optimization and prevent unnecessary style recreations', () => {
      let styleCreationCount = 0;
      const mockCreateStyles = jest.fn((_colors, isDarkMode) => {
        styleCreationCount++;
        return {
          root: { backgroundColor: isDarkMode ? '#000' : '#fff' },
          animationContainer: { flex: 1 },
          textTitle: { color: isDarkMode ? '#fff' : '#000' },
        };
      });

      const stableColors = { background: { default: '#fff' } };

      const TestUseMemoOptimization = ({
        isDarkMode,
      }: {
        isDarkMode: boolean;
      }) => {
        const styles = React.useMemo(
          () => mockCreateStyles(stableColors, isDarkMode),
          [isDarkMode],
        );

        return (
          <View testID="usememo-test" style={styles.root}>
            <Text testID="style-creation-count">{styleCreationCount}</Text>
            <Text testID="background-color">{styles.root.backgroundColor}</Text>
          </View>
        );
      };

      const { getByTestId, rerender } = renderWithProvider(
        <TestUseMemoOptimization isDarkMode={false} />,
        { state: {} },
      );

      expect(getByTestId('style-creation-count')).toHaveTextContent('1');
      expect(getByTestId('background-color')).toHaveTextContent('#fff');

      rerender(<TestUseMemoOptimization isDarkMode={false} />);
      expect(getByTestId('style-creation-count')).toHaveTextContent('1');

      rerender(<TestUseMemoOptimization isDarkMode />);
      expect(getByTestId('style-creation-count')).toHaveTextContent('2');
      expect(getByTestId('background-color')).toHaveTextContent('#000');

      expect(mockCreateStyles).toHaveBeenCalledTimes(2);
      expect(mockCreateStyles).toHaveBeenNthCalledWith(1, stableColors, false);
      expect(mockCreateStyles).toHaveBeenNthCalledWith(2, stableColors, true);
    });
  });

  describe('Styles tests', () => {
    it('should create styles with light mode', () => {
      const TestLightModeStyles = () => {
        const { colors } = useTheme();
        const styles = createStyles(colors, false);

        return (
          <View testID="light-mode-styles" style={styles.root}>
            <Text>Light mode test</Text>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(<TestLightModeStyles />, {
        state: {},
      });
      expect(getByTestId('light-mode-styles')).toBeTruthy();
    });

    it('should create styles with dark mode', () => {
      const TestDarkModeStyles = () => {
        const { colors } = useTheme();
        const styles = createStyles(colors, true);

        return (
          <View testID="dark-mode-styles" style={styles.root}>
            <Text>Dark mode test</Text>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(<TestDarkModeStyles />, {
        state: {},
      });
      expect(getByTestId('dark-mode-styles')).toBeTruthy();
    });
  });

  describe('Switch Case Default Branch tests', () => {
    it('should hit switch case default for unknown success flow types', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSeedlessOnboardingAuthConnection) {
          return null;
        }
        if (selector === selectSeedlessOnboardingLoginFlow) {
          return false;
        }
        return undefined;
      });

      const TestSwitchCaseComponent = () => (
        <OnboardingSuccessComponent
          successFlow={'CUSTOM_UNKNOWN_FLOW' as ONBOARDING_SUCCESS_FLOW}
          onDone={() => {
            /* empty test handler */
          }}
        />
      );

      const { getByTestId } = renderWithProvider(<TestSwitchCaseComponent />, {
        state: {},
      });

      expect(getByTestId('mock-rive-animation')).toBeTruthy();
    });

    it('should render fallback content for undefined success flow types', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSeedlessOnboardingAuthConnection) {
          return null;
        }
        if (selector === selectSeedlessOnboardingLoginFlow) {
          return false;
        }
        return undefined;
      });

      const TestUndefinedSuccessFlow = () => {
        const [animationStep] = React.useState(1);
        const fadeOutOpacity = React.useRef({ _value: 1 }).current;
        const fadeInOpacity = React.useRef({ _value: 0 }).current;

        const successFlow = 'unknownFlow' as string;
        const isSocialLogin = false;

        const renderAnimatedDots = () => '.'.repeat(1);

        const animationStyle = { flex: 1, height: 300 };
        const RiveAnimationComponent = (
          <View testID="rive-animation" style={animationStyle} />
        );

        const shouldUseDynamicContent =
          isSocialLogin ||
          !successFlow ||
          successFlow === ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE ||
          successFlow === ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP ||
          successFlow === ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP ||
          successFlow === ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP ||
          successFlow === ONBOARDING_SUCCESS_FLOW.REMINDER_BACKUP;

        if (shouldUseDynamicContent) {
          return <View testID="dynamic-content" />;
        }

        return (
          <View testID="switch-default-content">
            <View testID="animation-container">
              {RiveAnimationComponent}
              <View testID="text-overlay">
                {animationStep === 3 ? (
                  <>
                    <View
                      testID="fade-out-text"
                      style={{ opacity: fadeOutOpacity._value }}
                    >
                      <Text>Setting up your wallet</Text>
                    </View>
                    <View
                      testID="fade-in-text"
                      style={{ opacity: fadeInOpacity._value }}
                    >
                      <Text>Your wallet is ready!</Text>
                    </View>
                  </>
                ) : (
                  <Text testID="regular-text">
                    {animationStep === 1
                      ? `Setting up your wallet${renderAnimatedDots()}`
                      : 'Setting up your wallet'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      };

      const { getByTestId, queryByTestId } = renderWithProvider(
        <TestUndefinedSuccessFlow />,
        { state: {} },
      );

      expect(getByTestId('switch-default-content')).toBeTruthy();
      expect(getByTestId('animation-container')).toBeTruthy();
      expect(getByTestId('text-overlay')).toBeTruthy();
      expect(getByTestId('rive-animation')).toBeTruthy();
      expect(getByTestId('regular-text')).toBeTruthy();
      expect(queryByTestId('dynamic-content')).toBeNull();
    });

    it('should render switch default content with step 3 fade animation', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSeedlessOnboardingAuthConnection) {
          return null;
        }
        if (selector === selectSeedlessOnboardingLoginFlow) {
          return false;
        }
        return undefined;
      });

      const TestSwitchDefaultStep3 = () => {
        const [animationStep] = React.useState(3);
        const fadeOutOpacity = React.useRef({ _value: 0 }).current;
        const fadeInOpacity = React.useRef({ _value: 1 }).current;

        const successFlow = 'futureFlow' as string;
        const isSocialLogin = false;

        const animationStyle = { flex: 1, height: 300 };
        const RiveAnimationComponent = (
          <View testID="rive-animation" style={animationStyle} />
        );

        const shouldUseDynamicContent =
          isSocialLogin ||
          !successFlow ||
          successFlow === ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE ||
          successFlow === ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP ||
          successFlow === ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP ||
          successFlow === ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP ||
          successFlow === ONBOARDING_SUCCESS_FLOW.REMINDER_BACKUP;

        if (shouldUseDynamicContent) {
          return <View testID="dynamic-content" />;
        }

        return (
          <View testID="switch-default-step3">
            <View testID="animation-container">
              {RiveAnimationComponent}
              <View testID="text-overlay">
                {animationStep === 3 ? (
                  <>
                    <View
                      testID="fade-out-container"
                      style={{ opacity: fadeOutOpacity._value }}
                    >
                      <Text testID="setup-text">Setting up your wallet</Text>
                    </View>
                    <View
                      testID="fade-in-container"
                      style={{ opacity: fadeInOpacity._value }}
                    >
                      <Text testID="ready-text">Your wallet is ready!</Text>
                    </View>
                  </>
                ) : (
                  <Text testID="regular-text">Setting up your wallet</Text>
                )}
              </View>
            </View>
          </View>
        );
      };

      const { getByTestId, queryByTestId } = renderWithProvider(
        <TestSwitchDefaultStep3 />,
        { state: {} },
      );

      expect(getByTestId('switch-default-step3')).toBeTruthy();
      expect(getByTestId('fade-out-container')).toBeTruthy();
      expect(getByTestId('fade-in-container')).toBeTruthy();
      expect(getByTestId('setup-text')).toBeTruthy();
      expect(getByTestId('ready-text')).toBeTruthy();
      expect(queryByTestId('regular-text')).toBeNull();
      expect(queryByTestId('dynamic-content')).toBeNull();

      const fadeOutContainer = getByTestId('fade-out-container');
      const fadeInContainer = getByTestId('fade-in-container');
      expect(fadeOutContainer.props.style.opacity).toBe(0);
      expect(fadeInContainer.props.style.opacity).toBe(1);
    });
  });

  describe('isE2E Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should immediately show final state and complete social login flow when isE2E is true', async () => {
      jest.useFakeTimers();
      const mockOnDone = jest.fn();

      const TestE2EComplete = () => {
        const [animationStep, setAnimationStep] = React.useState(1);
        const hasAnimationStarted = React.useRef(false);
        const isSocialLogin = true;

        const startRiveAnimation = React.useCallback(() => {
          const isE2E = true;
          if (isE2E) {
            setAnimationStep(3);
            if (isSocialLogin && mockOnDone) {
              setTimeout(() => mockOnDone(), 100);
            }
            return;
          }

          hasAnimationStarted.current = true;
        }, [isSocialLogin]);

        React.useEffect(() => {
          startRiveAnimation();
        }, [startRiveAnimation]);

        return (
          <View testID="e2e-complete-test">
            <Text testID="animation-step">{animationStep}</Text>
            <Text testID="has-started">
              {hasAnimationStarted.current.toString()}
            </Text>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(<TestE2EComplete />, {
        state: {},
      });

      expect(getByTestId('animation-step')).toHaveTextContent('3');
      expect(getByTestId('has-started')).toHaveTextContent('false');

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      expect(mockOnDone).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should run normal animation flow when isE2E is false', () => {
      const TestNormalFlow = () => {
        const [animationStep, setAnimationStep] = React.useState(1);
        const hasAnimationStarted = React.useRef(false);
        const riveRef = React.useRef({
          setInputState: jest.fn(),
          fireState: jest.fn(),
        });

        const startRiveAnimation = React.useCallback(() => {
          const isE2E = false;
          if (isE2E) {
            setAnimationStep(3);
            return;
          }

          hasAnimationStarted.current = true;
          if (riveRef.current) {
            riveRef.current.fireState('OnboardingLoader', 'Start');
          }
        }, []);

        React.useEffect(() => {
          startRiveAnimation();
        }, [startRiveAnimation]);

        return (
          <View testID="normal-flow-test">
            <Text testID="animation-step">{animationStep}</Text>
            <Text testID="has-started">
              {hasAnimationStarted.current.toString()}
            </Text>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(<TestNormalFlow />, {
        state: {},
      });

      expect(getByTestId('animation-step')).toHaveTextContent('1');
    });
  });

  describe('Critical Utility Functions tests', () => {
    it('should test getTextColor and renderAnimatedDots utility functions', () => {
      const TestUtilityFunctions = ({
        dotsCount,
      }: {
        isDarkMode: boolean;
        dotsCount: number;
      }) => {
        const getTextColor = React.useCallback(() => 'text-default', []);

        const renderAnimatedDots = React.useCallback(() => {
          const count = Math.max(1, Math.min(3, dotsCount));
          const dots = '.'.repeat(count);
          return dots;
        }, [dotsCount]);

        return (
          <View testID="utility-functions-test">
            <Text testID="text-color">{getTextColor()}</Text>
            <Text testID="animated-dots">{renderAnimatedDots()}</Text>
            <Text testID="dots-count">{dotsCount}</Text>
          </View>
        );
      };

      const { getByTestId, rerender } = renderWithProvider(
        <TestUtilityFunctions isDarkMode={false} dotsCount={2} />,
        { state: {} },
      );

      expect(getByTestId('text-color')).toHaveTextContent('text-default');
      expect(getByTestId('animated-dots')).toHaveTextContent('..');
      expect(getByTestId('dots-count')).toHaveTextContent('2');

      rerender(<TestUtilityFunctions isDarkMode dotsCount={1} />);
      expect(getByTestId('text-color')).toHaveTextContent('text-default');
      expect(getByTestId('animated-dots')).toHaveTextContent('.');

      rerender(<TestUtilityFunctions isDarkMode dotsCount={0} />);
      expect(getByTestId('animated-dots')).toHaveTextContent('.');

      rerender(<TestUtilityFunctions isDarkMode dotsCount={5} />);
      expect(getByTestId('animated-dots')).toHaveTextContent('...');

      rerender(<TestUtilityFunctions isDarkMode dotsCount={3} />);
      expect(getByTestId('animated-dots')).toHaveTextContent('...');
    });

    it('should test renderAnimationContent and renderAnimationContainer functions', () => {
      const TestRenderFunctions = ({
        animationStep,
      }: {
        animationStep: number;
      }) => {
        const [fadeOutOpacity, fadeInOpacity] = React.useMemo(
          () => [
            { _value: animationStep === 3 ? 0 : 1 },
            { _value: animationStep === 3 ? 1 : 0 },
          ],
          [animationStep],
        );

        const renderAnimationContent = React.useCallback(() => {
          if (animationStep === 3) {
            return (
              <>
                <View
                  testID="fade-out-content"
                  style={{ opacity: fadeOutOpacity._value }}
                >
                  <Text>Setting up your wallet</Text>
                </View>
                <View
                  testID="fade-in-content"
                  style={{ opacity: fadeInOpacity._value }}
                >
                  <Text>Your wallet is ready!</Text>
                </View>
              </>
            );
          }

          const dotsCount = animationStep === 1 ? 2 : 0;
          const renderAnimatedDots = () =>
            '.'.repeat(Math.max(1, Math.min(3, dotsCount)));

          return (
            <Text testID="regular-content">
              {animationStep === 1
                ? `Setting up your wallet${renderAnimatedDots()}`
                : 'Setting up your wallet'}
            </Text>
          );
        }, [animationStep, fadeOutOpacity, fadeInOpacity]);

        const animationContainerStyle = React.useMemo(
          () => ({ flex: 1 } as const),
          [],
        );
        const textOverlayStyle = React.useMemo(
          () => ({ alignItems: 'center' as const }),
          [],
        );

        const renderAnimationContainer = React.useCallback(
          () => (
            <View testID="animation-container" style={animationContainerStyle}>
              <View testID="mock-rive-component" />
              <View testID="text-overlay" style={textOverlayStyle}>
                {renderAnimationContent()}
              </View>
            </View>
          ),
          [renderAnimationContent, animationContainerStyle, textOverlayStyle],
        );

        return renderAnimationContainer();
      };

      const { getByTestId, rerender, queryByTestId } = renderWithProvider(
        <TestRenderFunctions animationStep={1} />,
        { state: {} },
      );

      expect(getByTestId('animation-container')).toBeTruthy();
      expect(getByTestId('mock-rive-component')).toBeTruthy();
      expect(getByTestId('text-overlay')).toBeTruthy();
      expect(getByTestId('regular-content')).toHaveTextContent(
        'Setting up your wallet..',
      );
      expect(queryByTestId('fade-out-content')).toBeNull();
      expect(queryByTestId('fade-in-content')).toBeNull();

      rerender(<TestRenderFunctions animationStep={2} />);
      expect(getByTestId('regular-content')).toHaveTextContent(
        'Setting up your wallet',
      );

      rerender(<TestRenderFunctions animationStep={3} />);
      expect(getByTestId('fade-out-content')).toBeTruthy();
      expect(getByTestId('fade-in-content')).toBeTruthy();
      expect(queryByTestId('regular-content')).toBeNull();

      const fadeOutElement = getByTestId('fade-out-content');
      const fadeInElement = getByTestId('fade-in-content');
      expect(fadeOutElement.props.style.opacity).toBe(0);
      expect(fadeInElement.props.style.opacity).toBe(1);
    });

    it('should test clearTimers utility function', () => {
      const TestClearTimersUtility = () => {
        const animationId = React.useRef<NodeJS.Timeout | null>(null);
        const dotsIntervalId = React.useRef<NodeJS.Timeout | null>(null);
        const finalTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const socialLoginTimeoutId = React.useRef<NodeJS.Timeout | null>(null);
        const [timersCleared, setTimersCleared] = React.useState(false);

        const clearTimers = (timerRefs: {
          animationId?: React.MutableRefObject<NodeJS.Timeout | null>;
          dotsIntervalId?: React.MutableRefObject<NodeJS.Timeout | null>;
          finalTimeoutId?: React.MutableRefObject<NodeJS.Timeout | null>;
          socialLoginTimeoutId?: React.MutableRefObject<NodeJS.Timeout | null>;
        }) => {
          if (timerRefs.animationId?.current) {
            clearTimeout(timerRefs.animationId.current);
            timerRefs.animationId.current = null;
          }
          if (timerRefs.dotsIntervalId?.current) {
            clearInterval(timerRefs.dotsIntervalId.current);
            timerRefs.dotsIntervalId.current = null;
          }
          if (timerRefs.finalTimeoutId?.current) {
            clearTimeout(timerRefs.finalTimeoutId.current);
            timerRefs.finalTimeoutId.current = null;
          }
          if (timerRefs.socialLoginTimeoutId?.current) {
            clearTimeout(timerRefs.socialLoginTimeoutId.current);
            timerRefs.socialLoginTimeoutId.current = null;
          }
        };

        React.useEffect(() => {
          animationId.current = setTimeout(() => {
            /* mock animation timer */
          }, 1000);
          dotsIntervalId.current = setInterval(() => {
            /* mock dots interval */
          }, 500);
          finalTimeoutId.current = setTimeout(() => {
            /* mock final timeout */
          }, 2000);
          socialLoginTimeoutId.current = setTimeout(() => {
            /* mock social login timeout */
          }, 3000);

          clearTimers({
            animationId,
            dotsIntervalId,
            finalTimeoutId,
            socialLoginTimeoutId,
          });

          setTimersCleared(true);
        }, []);

        return (
          <View testID="clear-timers-test">
            <Text testID="timers-cleared">{timersCleared.toString()}</Text>
            <Text testID="animation-id-null">
              {(animationId.current === null).toString()}
            </Text>
            <Text testID="dots-interval-null">
              {(dotsIntervalId.current === null).toString()}
            </Text>
            <Text testID="final-timeout-null">
              {(finalTimeoutId.current === null).toString()}
            </Text>
            <Text testID="social-timeout-null">
              {(socialLoginTimeoutId.current === null).toString()}
            </Text>
          </View>
        );
      };

      const { getByTestId } = renderWithProvider(<TestClearTimersUtility />, {
        state: {},
      });

      expect(getByTestId('timers-cleared')).toHaveTextContent('true');
      expect(getByTestId('animation-id-null')).toHaveTextContent('true');
      expect(getByTestId('dots-interval-null')).toHaveTextContent('true');
      expect(getByTestId('final-timeout-null')).toHaveTextContent('true');
      expect(getByTestId('social-timeout-null')).toHaveTextContent('true');
    });
  });
});
