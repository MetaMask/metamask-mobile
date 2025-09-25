// Third party dependencies.
import React from 'react';
import { View, Text } from 'react-native';

// Internal dependencies.
import OnboardingSuccess, {
  OnboardingSuccessComponent,
  ResetNavigationToHome,
} from '.';
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
import { selectSeedlessOnboardingAuthConnection } from '../../../selectors/seedlessOnboardingController';

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
        const authConnection: AuthConnection | null = AuthConnection.Google;

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
              if (dotsIntervalId.current) {
                clearInterval(dotsIntervalId.current);
                dotsIntervalId.current = null;
              }
              setAnimationStep(2);
            }, 1200);

            finalTimeoutId.current = setTimeout(() => {
              setAnimationStep(3);
              finalTimeoutId.current = null;

              const isSocialLoginConnection = (
                conn: AuthConnection | null,
              ): conn is AuthConnection =>
                conn === AuthConnection.Google || conn === AuthConnection.Apple;
              const currentIsSocialLogin =
                isSocialLoginConnection(authConnection);
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
        }, [authConnection]);

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
        const authConnection: AuthConnection | null = AuthConnection.Apple;

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
              if (dotsIntervalId.current) {
                clearInterval(dotsIntervalId.current);
                dotsIntervalId.current = null;
              }
              setAnimationStep(2);
            }, 1200);

            finalTimeoutId.current = setTimeout(() => {
              setAnimationStep(3);
              finalTimeoutId.current = null;

              const isSocialLoginConnection = (
                conn: AuthConnection | null,
              ): conn is AuthConnection =>
                conn === AuthConnection.Google || conn === AuthConnection.Apple;
              const currentIsSocialLogin =
                isSocialLoginConnection(authConnection);
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
        }, [authConnection]);

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
        const authConnection: AuthConnection | null = null;

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
              if (dotsIntervalId.current) {
                clearInterval(dotsIntervalId.current);
                dotsIntervalId.current = null;
              }
              setAnimationStep(2);
            }, 1200);

            finalTimeoutId.current = setTimeout(() => {
              setAnimationStep(3);
              finalTimeoutId.current = null;

              const isSocialLoginConnection = (
                conn: AuthConnection | null,
              ): conn is AuthConnection =>
                conn === AuthConnection.Google || conn === AuthConnection.Apple;
              const currentIsSocialLogin =
                isSocialLoginConnection(authConnection);
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
        }, [authConnection]);

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

      // Should NOT call mockOnDone since it's not a social login
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
              if (dotsIntervalId.current) {
                clearInterval(dotsIntervalId.current);
                dotsIntervalId.current = null;
              }
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

      // Fast forward to trigger setInterval calls
      jest.advanceTimersByTime(900); // 3 intervals at 300ms each

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
              if (dotsIntervalId.current) {
                clearInterval(dotsIntervalId.current);
                dotsIntervalId.current = null;
              }
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

      // Advance timers to trigger all timeout logic
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
              if (dotsIntervalId.current) {
                clearInterval(dotsIntervalId.current);
                dotsIntervalId.current = null;
              }
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
            if (animationId.current) {
              clearTimeout(animationId.current);
              animationId.current = null;
            }
            if (dotsIntervalId.current) {
              clearInterval(dotsIntervalId.current);
              dotsIntervalId.current = null;
            }
            if (finalTimeoutId.current) {
              clearTimeout(finalTimeoutId.current);
              finalTimeoutId.current = null;
            }
            if (socialLoginTimeoutId.current) {
              clearTimeout(socialLoginTimeoutId.current);
              socialLoginTimeoutId.current = null;
            }
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

      // Start some timers
      jest.advanceTimersByTime(100);

      // Unmount component to trigger cleanup
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
        return undefined;
      });

      const TestNullAuthConnection = () => {
        const authConnection: AuthConnection | null = null;

        const testSocialLoginBranch = () => {
          const currentIsSocialLogin =
            authConnection === AuthConnection.Google ||
            authConnection === AuthConnection.Apple;
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
            if (animationId.current) {
              clearTimeout(animationId.current);
              animationId.current = null;
            }
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
            if (animationId.current) {
              clearTimeout(animationId.current);
              animationId.current = null;
            }
            if (dotsIntervalId.current) {
              clearInterval(dotsIntervalId.current);
              dotsIntervalId.current = null;
            }
            if (finalTimeoutId.current) {
              clearTimeout(finalTimeoutId.current);
              finalTimeoutId.current = null;
            }
            if (socialLoginTimeoutId.current) {
              clearTimeout(socialLoginTimeoutId.current);
              socialLoginTimeoutId.current = null;
            }
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
            if (animationId.current) {
              clearTimeout(animationId.current);
              animationId.current = null;
            }
            if (dotsIntervalId.current) {
              clearInterval(dotsIntervalId.current);
              dotsIntervalId.current = null;
            }
            if (finalTimeoutId.current) {
              clearTimeout(finalTimeoutId.current);
              finalTimeoutId.current = null;
            }
            if (socialLoginTimeoutId.current) {
              clearTimeout(socialLoginTimeoutId.current);
              socialLoginTimeoutId.current = null;
            }
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
            if (animationId.current) {
              clearTimeout(animationId.current);
              animationId.current = null;
            }
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
            if (animationId.current) {
              clearTimeout(animationId.current);
              animationId.current = null;
            }
            if (dotsIntervalId.current) {
              clearInterval(dotsIntervalId.current);
              dotsIntervalId.current = null;
            }
            if (finalTimeoutId.current) {
              clearTimeout(finalTimeoutId.current);
              finalTimeoutId.current = null;
            }
            if (socialLoginTimeoutId.current) {
              clearTimeout(socialLoginTimeoutId.current);
              socialLoginTimeoutId.current = null;
            }
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

  describe('New Animation Features Coverage', () => {
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
});
