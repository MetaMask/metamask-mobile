import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import UnstakeConfirmationView, {
  UNSTAKE_CONFIRMATION_VIEW_BACK_BUTTON_TEST_ID,
} from './UnstakeConfirmationView';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { Image, ImageSize } from 'react-native';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { UnstakeConfirmationViewRouteParams } from './UnstakeConfirmationView.types';
import { MOCK_POOL_STAKING_SDK } from '../../__mocks__/stakeMockData';
import { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';

const MOCK_ADDRESS_1 = '0x0';
const MOCK_ADDRESS_2 = '0x1';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

const mockSelectedAccount =
  MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[
    MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.selectedAccount
  ];

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTreeController: {
        accountTree: {
          wallets: {
            'keyring:test-wallet': {
              groups: {
                'keyring:test-wallet/ethereum': {
                  accounts: [mockSelectedAccount.id],
                },
              },
            },
          },
        },
        selectedAccountGroup: 'keyring:test-wallet/ethereum',
      },
    },
  },
};

jest.mock('../../../../hooks/useIpfsGateway', () => jest.fn());

Image.getSize = jest.fn(
  (
    _uri: string,
    success?: (width: number, height: number) => void,
    _failure?: (error: Error) => void,
  ) => {
    if (success) {
      success(100, 100);
    }
    return Promise.resolve<ImageSize>({ width: 100, height: 100 });
  },
);
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      key: '1',
      name: 'params',
      params: {
        amountWei: '4999820000000000000',
        amountFiat: '12894.52',
      } as UnstakeConfirmationViewRouteParams,
    }),
  };
});

const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({
  name: 'UNSTAKE_CONFIRMATION_BACK_CLICKED',
});
const mockEventBuilder = {
  addProperties: mockAddProperties,
  build: mockBuild,
};
const mockCreateEventBuilder = jest.fn().mockReturnValue(mockEventBuilder);
const mockTrackEvent = jest.fn();

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../hooks/usePoolStakedDeposit', () => ({
  __esModule: true,
  default: () => ({
    attemptDepositTransaction: jest.fn(),
  }),
}));

jest.mock('../../hooks/usePooledStakes', () => ({
  __esModule: true,
  default: () => ({
    refreshPooledStakes: jest.fn(),
  }),
}));

jest.mock('../../hooks/useStakeContext', () => ({
  __esModule: true,
  useStakeContext: jest.fn(() => MOCK_POOL_STAKING_SDK),
}));

describe('UnstakeConfirmationView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderView = () =>
    renderWithProvider(<UnstakeConfirmationView />, {
      state: mockInitialState,
    });

  it('renders unstake confirmation view', () => {
    const { getByText } = renderView();

    expect(getByText(strings('stake.unstaking_to'))).toBeOnTheScreen();
    expect(getByText(strings('stake.interacting_with'))).toBeOnTheScreen();
    expect(getByText('Cancel')).toBeOnTheScreen();
    expect(getByText('Continue')).toBeOnTheScreen();
  });

  it('renders header with the unstake title', () => {
    const { getByText } = renderView();

    expect(getByText(strings('stake.unstake'))).toBeOnTheScreen();
  });

  it('calls navigation.goBack on back press', () => {
    const { getByTestId } = renderView();

    fireEvent.press(getByTestId(UNSTAKE_CONFIRMATION_VIEW_BACK_BUTTON_TEST_ID));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('tracks UNSTAKE_CONFIRMATION_BACK_CLICKED on back press', () => {
    const { getByTestId } = renderView();

    fireEvent.press(getByTestId(UNSTAKE_CONFIRMATION_VIEW_BACK_BUTTON_TEST_ID));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.UNSTAKE_CONFIRMATION_BACK_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      selected_provider: EVENT_PROVIDERS.CONSENSYS,
      location: EVENT_LOCATIONS.UNSTAKE_CONFIRMATION_VIEW,
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});
