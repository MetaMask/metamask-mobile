import React from 'react';
import EarnEmptyStateCta from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TokenI } from '../../../Tokens/types';
import { MOCK_USDC_MAINNET_ASSET } from '../../../Stake/__mocks__/mockData';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../../util/test/initial-root-state';
import { strings } from '../../../../../../locales/i18n';
import { act, fireEvent } from '@testing-library/react-native';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
// eslint-disable-next-line import/no-namespace
import * as useEarnTokenDetails from '../../../Earn/hooks/useEarnTokenDetails';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';

jest.mock('../../../../hooks/useMetrics');

const mockTrackEvent = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn(),
}));

const initialState = {
  ...initialRootState,
  engine: {
    ...initialRootState.engine,
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const renderComponent = (token: TokenI, state = initialState) =>
  renderWithProvider(<EarnEmptyStateCta token={token} />, {
    state,
  });

describe('EmptyStateCta', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
      getDeleteRegulationId: jest.fn(),
      isDataRecorded: jest.fn(),
      isEnabled: jest.fn(),
      getMetaMetricsId: jest.fn(),
    });

    jest.spyOn(useEarnTokenDetails, 'useEarnTokenDetails').mockReturnValue({
      getTokenWithBalanceAndApr: () => ({
        ...MOCK_USDC_MAINNET_ASSET,
        apr: '4.5',
        estimatedAnnualRewardsFormatted: '$5',
        balanceFiat: '$100',
        balanceFormatted: '$100 USDC',
        balanceMinimalUnit: '100',
        balanceFiatNumber: 100,
      }),
    });
  });

  beforeEach(() => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);
  });

  it('renders correctly', () => {
    const { toJSON } = renderComponent(MOCK_USDC_MAINNET_ASSET);
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to deposit screen when "start earning" button is clicked', async () => {
    const { findByText } = renderComponent(MOCK_USDC_MAINNET_ASSET);

    const startEarningButton = await findByText(
      strings('earn.empty_state_cta.start_earning'),
    );

    await act(() => {
      fireEvent.press(startEarningButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      params: {
        action: 'LEND',
        token: {
          address: MOCK_USDC_MAINNET_ASSET.address,
          aggregators: [],
          balance: '',
          balanceFiat: '',
          chainId: '0x1',
          decimals: 6,
          image: '',
          isETH: false,
          isNative: false,
          isStaked: false,
          logo: '',
          name: 'USDC',
          symbol: 'USDC',
          ticker: 'USDC',
        },
      },
      screen: 'Stake',
    });
  });

  it('submits metrics event on button click', async () => {
    const { findByText } = renderComponent(MOCK_USDC_MAINNET_ASSET);

    const startEarningButton = await findByText(
      strings('earn.empty_state_cta.start_earning'),
    );

    await act(() => {
      fireEvent.press(startEarningButton);
    });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: MetaMetricsEvents.EARN_EMPTY_STATE_CTA_CLICKED.category,
      properties: {
        estimatedAnnualRewards: '$5',
        location: EVENT_LOCATIONS.TOKEN_DETAILS_SCREEN,
        provider: EVENT_PROVIDERS.CONSENSYS,
        token_chain_id: '1',
        token_name: 'USDC',
        token_symbol: 'USDC',
      },
      saveDataRecording: true,
      sensitiveProperties: {},
    });
  });

  it('does not render if token prop is missing', () => {
    const { toJSON } = renderComponent({} as TokenI);
    expect(toJSON()).toBeNull();
  });

  it('does not render if stablecoin lending feature flag disabled', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(false);

    const { toJSON } = renderComponent(MOCK_USDC_MAINNET_ASSET);
    expect(toJSON()).toBeNull();
  });
});
