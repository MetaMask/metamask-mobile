import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import StakeConfirmationView, {
  STAKE_CONFIRMATION_VIEW_BACK_BUTTON_TEST_ID,
} from './StakeConfirmationView';
import { Image, ImageSize } from 'react-native';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { StakeConfirmationViewRouteParams } from './StakeConfirmationView.types';
import { MOCK_POOL_STAKING_SDK } from '../../__mocks__/stakeMockData';
import { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';

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
const MOCK_ADDRESS_1 = '0x0';
const MOCK_ADDRESS_2 = '0x1';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

const mockStore = configureMockStore();

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
const store = mockStore(mockInitialState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      key: '1',
      name: 'params',
      params: {
        amountWei: '10000000000000000',
        amountFiat: '26.21',
        annualRewardRate: '2.6%',
        annualRewardsETH: '0.00026 ETH',
        annualRewardsFiat: '$0.68',
        chainId: '1',
      } as StakeConfirmationViewRouteParams,
    }),
  };
});

const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({
  name: 'STAKE_CONFIRMATION_BACK_CLICKED',
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

jest.mock('../../hooks/useStakeContext', () => ({
  __esModule: true,
  useStakeContext: jest.fn(() => MOCK_POOL_STAKING_SDK),
}));

jest.mock('../../hooks/usePooledStakes', () => ({
  __esModule: true,
  default: () => ({
    refreshPooledStakes: jest.fn(),
  }),
}));

describe('StakeConfirmationView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderView = () =>
    renderWithProvider(
      <Provider store={store}>
        <StakeConfirmationView />
      </Provider>,
    );

  it('renders stake confirmation view', () => {
    const { getByText } = renderView();

    expect(getByText(strings('stake.staking_from'))).toBeOnTheScreen();
  });

  it('renders header with the stake title', () => {
    const { getByText } = renderView();

    expect(getByText(strings('stake.stake'))).toBeOnTheScreen();
  });

  it('calls navigation.goBack and tracks STAKE_CONFIRMATION_BACK_CLICKED on back press', () => {
    const { getByTestId } = renderView();

    fireEvent.press(getByTestId(STAKE_CONFIRMATION_VIEW_BACK_BUTTON_TEST_ID));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.STAKE_CONFIRMATION_BACK_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      selected_provider: EVENT_PROVIDERS.CONSENSYS,
      location: EVENT_LOCATIONS.STAKE_CONFIRMATION_VIEW,
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
