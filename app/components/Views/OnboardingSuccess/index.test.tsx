// Third party dependencies.
import React from 'react';

// Internal dependencies.
import OnboardingSuccess, {
  OnboardingSuccessComponent,
  ResetNavigationToHome,
} from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { OnboardingSuccessSelectorIDs } from './OnboardingSuccess.testIds';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import Engine from '../../../core/Engine/Engine';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';

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
      updateExchangeRates: jest.fn().mockResolvedValue(undefined),
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

const mockNavigationDispatch = jest.fn();

let mockRouteParams: { successFlow?: ONBOARDING_SUCCESS_FLOW } | undefined = {};

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
      getParent: () => ({
        pop: jest.fn(),
      }),
    }),
    useRoute: () => ({
      key: 'OnboardingSuccess',
      name: 'OnboardingSuccess',
      params: mockRouteParams,
    }),
  };
});

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

describe('OnboardingSuccessComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('calls discoverAccounts when onDone is called', () => {
    const { getByTestId } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
      />,
    );
    const button = getByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON);
    fireEvent.press(button);

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
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.DEFAULT_SETTINGS,
    );
  });

  it('displays correct title for SETTINGS_BACKUP flow', () => {
    const { getByText } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        successFlow={ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP}
      />,
    );

    expect(getByText(strings('onboarding_success.title'))).toBeOnTheScreen();
  });

  it('displays wallet ready title for non-SETTINGS_BACKUP flows', () => {
    const { getByText } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
      />,
    );

    expect(
      getByText(strings('onboarding_success.wallet_ready')),
    ).toBeOnTheScreen();
  });

  it('renders OnboardingSuccessEndAnimation component', () => {
    const { getByTestId } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        successFlow={ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP}
      />,
    );

    expect(getByTestId('onboarding-success-end-animation')).toBeOnTheScreen();
  });

  it('hides manage default settings button for SETTINGS_BACKUP flow', () => {
    const { queryByTestId } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        successFlow={ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP}
      />,
    );

    const footerButton = queryByTestId(
      OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON,
    );

    expect(footerButton).toBeNull();
  });

  it('shows manage default settings button for non-SETTINGS_BACKUP flows', () => {
    const { getByTestId } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={jest.fn()}
        successFlow={ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP}
      />,
    );

    const footerButton = getByTestId(
      OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON,
    );

    expect(footerButton).toBeOnTheScreen();
  });
});

describe('OnboardingSuccess', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (useSelector as jest.Mock).mockReset();
    mockDiscoverAccounts.mockReset();
    mockRouteParams = {};
  });

  describe('route params successFlow is IMPORT_FROM_SEED_PHRASE', () => {
    it('renders matching snapshot with route params backedUpSRP false and noSRP false', () => {
      mockRouteParams = {
        successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
      };
      const { toJSON } = renderWithProvider(<OnboardingSuccess />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('fails to add networks to the network controller but renders the component', () => {
      (
        Engine.context.NetworkController.addNetwork as jest.Mock
      ).mockRejectedValue(new Error('Failed to add network'));
      const { toJSON } = renderWithProvider(<OnboardingSuccess />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('route params successFlow is NO_BACKED_UP_SRP', () => {
    it('renders matching snapshot with route params backedUpSRP true and noSRP false', () => {
      mockRouteParams = {
        successFlow: ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP,
      };
      const { toJSON } = renderWithProvider(<OnboardingSuccess />);

      expect(toJSON()).toMatchSnapshot();
    });

    it('dispatches ResetNavigationToHome action when done button is pressed', async () => {
      mockRouteParams = {
        successFlow: ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP,
      };
      const { getByTestId } = renderWithProvider(<OnboardingSuccess />);
      const button = getByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON);
      fireEvent.press(button);
      expect(mockDiscoverAccounts).toHaveBeenCalled();

      expect(mockNavigationDispatch).toHaveBeenCalledWith(
        ResetNavigationToHome,
      );
    });
  });

  describe('route params successFlow is BACKED_UP_SRP', () => {
    it('renders matching snapshot with route params backedUpSRP false and noSRP true', () => {
      mockRouteParams = { successFlow: ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP };
      const { toJSON } = renderWithProvider(<OnboardingSuccess />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('route params handling', () => {
    it('uses default successFlow when route is undefined', () => {
      mockRouteParams = undefined;
      const { getByText } = renderWithProvider(<OnboardingSuccess />);

      expect(
        getByText(strings('onboarding_success.wallet_ready')),
      ).toBeOnTheScreen();
    });

    it('uses default successFlow when route params are undefined', () => {
      mockRouteParams = undefined;
      const { toJSON } = renderWithProvider(<OnboardingSuccess />);
      // Should render with default BACKED_UP_SRP flow
      expect(toJSON()).toMatchSnapshot();
    });

    it('uses default successFlow when successFlow param is undefined', () => {
      mockRouteParams = {};
      const { toJSON } = renderWithProvider(<OnboardingSuccess />);
      // Should render with default BACKED_UP_SRP flow
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
