import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Routes from '../../../../../constants/navigation/Routes';
import { EARN_INPUT_VIEW_ACTIONS } from '../../../../../components/UI/Earn/Views/EarnInputView/EarnInputView.types';
import { EVENT_LOCATIONS as STAKE_EVENT_LOCATIONS } from '../../../../../components/UI/Stake/constants/events';
import useStakingEligibility from '../../../../../components/UI/Stake/hooks/useStakingEligibility';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../../../components/UI/Earn/selectors/featureFlags';
import { earnSelectors } from '../../../../../selectors/earnController/earn';
import { selectChainId } from '../../../../../selectors/networkController';
import type { RootState } from '../../../../../reducers';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletActionsBottomSheetSelectorsIDs } from '../../../WalletActions/WalletActionsBottomSheet.testIds';
import LegacyEarnTradeMenuRow from './LegacyEarnTradeMenuRow';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../components/UI/Earn/selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn(),
  selectStablecoinLendingEnabledFlag: jest.fn(),
}));

jest.mock('../../../../../selectors/earnController/earn', () => ({
  earnSelectors: {
    selectEarnTokens: jest.fn(),
  },
}));

jest.mock('../../../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
}));

jest.mock(
  '../../../../../components/UI/Stake/hooks/useStakingEligibility',
  () => ({
    __esModule: true,
    default: jest.fn(),
  }),
);

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockLegacyEvent = { event: 'EARN_BUTTON_CLICKED' };
const mockLegacyEventBuilder = {
  addProperties: jest.fn(),
  build: jest.fn().mockReturnValue(mockLegacyEvent),
};

jest.mock('../../../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockOnActionSelected = jest.fn<void, [() => void | Promise<void>]>();
const mockUseStakingEligibility = jest.mocked(useStakingEligibility);
const mockSelectPooledStakingEnabledFlag = jest.mocked(
  selectPooledStakingEnabledFlag,
);
const mockSelectStablecoinLendingEnabledFlag = jest.mocked(
  selectStablecoinLendingEnabledFlag,
);
const mockSelectEarnTokens = jest.mocked(earnSelectors.selectEarnTokens);
const mockSelectChainId = jest.mocked(selectChainId);

const getEarnTokensSelectorResult = (
  earnTokens: ReturnType<
    typeof earnSelectors.selectEarnTokens
  >['earnTokens'] = [],
): ReturnType<typeof earnSelectors.selectEarnTokens> => ({
  earnTokens,
  earnTokensByChainIdAndAddress: {},
  earnOutputTokens: [],
  earnOutputTokensByChainIdAndAddress: {},
  earnTokenPairsByChainIdAndAddress: {},
  earnOutputTokenPairsByChainIdAndAddress: {},
  earnableTotalFiatNumber: 0,
  earnableTotalFiatFormatted: '$0',
});

const renderLegacyRow = () =>
  render(
    <LegacyEarnTradeMenuRow
      onActionSelected={mockOnActionSelected}
      isDisabled={false}
    />,
  );

describe('LegacyEarnTradeMenuRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    mockUseSelector.mockImplementation((selector) => selector({} as RootState));
    mockSelectPooledStakingEnabledFlag.mockReturnValue(false);
    mockSelectStablecoinLendingEnabledFlag.mockReturnValue(true);
    mockSelectEarnTokens.mockReturnValue(getEarnTokensSelectorResult());
    mockSelectChainId.mockReturnValue('0x1');
    mockUseStakingEligibility.mockReturnValue({
      isEligible: true,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });
    mockCreateEventBuilder.mockReturnValue(mockLegacyEventBuilder);
    mockLegacyEventBuilder.addProperties.mockReturnValue(
      mockLegacyEventBuilder,
    );
  });

  it('renders the legacy row when lending and staking eligibility pass', () => {
    const { getByTestId, queryByTestId } = renderLegacyRow();

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_RATE_TAG),
    ).not.toBeOnTheScreen();
  });

  it('hides the row when staking eligibility fails', () => {
    mockUseStakingEligibility.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    const { queryByTestId } = renderLegacyRow();

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('hides the row when only ETH is available and pooled staking is disabled', () => {
    mockSelectEarnTokens.mockReturnValue(
      getEarnTokensSelectorResult([
        {
          address: '0x0',
          chainId: '0x1',
          decimals: 18,
          image: '',
          name: 'ETH',
          isETH: true,
          isStaked: false,
        },
      ] as never),
    );

    const { queryByTestId } = renderLegacyRow();

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('queues legacy Earn navigation with token-list params', () => {
    const { getByTestId } = renderLegacyRow();

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    );
    const callback = mockOnActionSelected.mock.calls[0][0];
    callback();

    expect(mockNavigate).toHaveBeenCalledWith('StakeModals', {
      screen: Routes.STAKING.MODALS.EARN_TOKEN_LIST,
      params: {
        tokenFilter: {
          includeNativeTokens: true,
          includeStakingTokens: false,
          includeLendingTokens: true,
          includeReceiptTokens: false,
        },
        onItemPressScreen: EARN_INPUT_VIEW_ACTIONS.DEPOSIT,
      },
    });
  });

  it('tracks legacy Earn navigation with wallet action properties', () => {
    const { getByTestId } = renderLegacyRow();

    act(() => {
      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
      );
      mockOnActionSelected.mock.calls[0][0]();
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.EARN_BUTTON_CLICKED,
    );
    expect(mockLegacyEventBuilder.addProperties).toHaveBeenCalledWith({
      text: 'Earn',
      location: STAKE_EVENT_LOCATIONS.WALLET_ACTIONS_BOTTOM_SHEET,
      chain_id_destination: '1',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(mockLegacyEvent);
  });
});
