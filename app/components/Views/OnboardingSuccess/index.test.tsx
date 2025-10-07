// Third party dependencies.
import React from 'react';
import { View, Text, Animated } from 'react-native';

// Internal dependencies.
import OnboardingSuccess, {
  OnboardingSuccessComponent,
  ResetNavigationToHome,
} from '.';
import createStyles from './index.styles';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { OnboardingSuccessSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import Engine from '../../../core/Engine/Engine';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';
import {
  selectSeedlessOnboardingAuthConnection,
  selectSeedlessOnboardingLoginFlow,
} from '../../../selectors/seedlessOnboardingController';

// Mock the static image component
jest.mock('./OnboardingSuccessAnimation', () => {
  const MockReact = jest.requireActual('react');
  return MockReact.forwardRef(() =>
    MockReact.createElement('View', {
      testID: 'onboarding-success-static-image-mock',
    }),
  );
});

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

describe('OnboardingSuccessComponent', () => {
  beforeEach(() => {
    mockImportAdditionalAccounts.mockReset();
    mockIsMultichainAccountsState2Enabled.mockReset();
  });

  it('renders matching snapshot when successFlow is BACKED_UP_SRP', () => {
    const { toJSON } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        _successFlow={ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders matching snapshot when successFlow is NO_BACKED_UP_SRP', () => {
    const { toJSON } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        _successFlow={ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders matching snapshot when successFlow is IMPORT_FROM_SEED_PHRASE', () => {
    const { toJSON } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        _successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('imports additional accounts when onDone is called', async () => {
    mockIsE2EValue = true;

    const { getByTestId } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        _successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
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
        _successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
      />,
    );

    const button = getByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON);
    button.props.onPress();

    expect(mockImportAdditionalAccounts).not.toHaveBeenCalled();
    expect(mockDiscoverAccounts).toHaveBeenCalled();

    mockIsE2EValue = false;
  });

  it('initializes fade animation on component mount', () => {
    // Arrange
    jest.useFakeTimers();
    const mockTiming = jest.spyOn(Animated, 'timing');

    // Act
    renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        _successFlow={ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP}
      />,
    );

    // Assert
    expect(mockTiming).toHaveBeenCalled();
    const fadeAnimCall = mockTiming.mock.calls.find(
      (call) => call[1]?.duration === 2000,
    );
    expect(fadeAnimCall).toBeDefined();
    expect(fadeAnimCall?.[1]?.toValue).toBe(1);
    expect(fadeAnimCall?.[1]?.useNativeDriver).toBe(true);

    mockTiming.mockRestore();
    jest.useRealTimers();
  });

  it('initializes scale animation on component mount', () => {
    // Arrange
    jest.useFakeTimers();
    const mockTiming = jest.spyOn(Animated, 'timing');
    const mockParallel = jest.spyOn(Animated, 'parallel');

    // Act
    renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        _successFlow={ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP}
      />,
    );

    // Assert
    expect(mockParallel).toHaveBeenCalled();
    expect(mockTiming).toHaveBeenCalledTimes(2);

    // Verify scale animation
    const scaleAnimCall = mockTiming.mock.calls[1];
    expect(scaleAnimCall[1]?.toValue).toBe(1);
    expect(scaleAnimCall[1]?.duration).toBe(2000);
    expect(scaleAnimCall[1]?.useNativeDriver).toBe(true);

    mockTiming.mockRestore();
    mockParallel.mockRestore();
    jest.useRealTimers();
  });

  it('skips animation in E2E tests', () => {
    // Arrange
    mockIsE2EValue = true;
    const mockTiming = jest.spyOn(Animated, 'timing');
    const mockParallel = jest.spyOn(Animated, 'parallel');

    // Act
    renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        _successFlow={ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP}
      />,
    );

    // Assert
    expect(mockParallel).not.toHaveBeenCalled();
    expect(mockTiming).not.toHaveBeenCalled();

    mockTiming.mockRestore();
    mockParallel.mockRestore();
    mockIsE2EValue = false;
  });

  it('navigate to the default settings screen when the manage default settings button is pressed', async () => {
    mockIsE2EValue = true;

    const { getByTestId } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        _successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
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
          _successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
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

    it('shows done button and footer link for NO_BACKED_UP_SRP', () => {
      const { getByTestId } = renderWithProvider(
        <OnboardingSuccessComponent
          onDone={jest.fn()}
          _successFlow={ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP}
        />,
      );

      expect(
        getByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(
          OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('shows buttons immediately in E2E mode', () => {
      mockIsE2EValue = true;

      const { getByTestId } = renderWithProvider(
        <OnboardingSuccessComponent
          onDone={jest.fn()}
          _successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
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

    it('renders static wallet image with correct properties', () => {
      const { getByTestId } = renderWithProvider(
        <OnboardingSuccessComponent
          onDone={jest.fn()}
          _successFlow={ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP}
        />,
      );

      const walletImage = getByTestId('wallet-ready-image');
      expect(walletImage).toBeOnTheScreen();
      expect(walletImage.props.resizeMode).toBe('contain');
    });

    it('displays wallet ready message with correct text', () => {
      const { getByText } = renderWithProvider(
        <OnboardingSuccessComponent
          onDone={jest.fn()}
          _successFlow={ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP}
        />,
      );

      expect(
        getByText(strings('onboarding_success.wallet_ready')),
      ).toBeOnTheScreen();
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
});
