import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { createSellNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import { createTokenSelectionNavDetails } from '../Views/TokenSelection/TokenSelection';
import { createBuildQuoteNavDetails } from '../Views/BuildQuote';
import { createEligibilityFailedModalNavigationDetails } from '../components/EligibilityFailedModal/EligibilityFailedModal';
import { createRampUnsupportedModalNavigationDetails } from '../components/RampUnsupportedModal/RampUnsupportedModal';
import { useRampNavigation } from './useRampNavigation';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders';

const mockSetSelectedToken = jest.fn();

jest.mock('./useRampsTokens', () => ({
  useRampsTokens: () => ({
    setSelectedToken: mockSetSelectedToken,
    tokens: { allTokens: [] },
  }),
}));

jest.mock('@react-navigation/native');
jest.mock('../Aggregator/routes/utils');
jest.mock('../Deposit/routes/utils');
jest.mock('../Views/TokenSelection/TokenSelection', () => {
  const actual = jest.requireActual('../Views/TokenSelection/TokenSelection');
  const mockFn = jest.fn();
  return {
    ...actual,
    createTokenSelectionNavDetails: mockFn,
    createTokenSelectionNavigationDetails: mockFn,
  };
});
jest.mock('../Views/BuildQuote', () => ({
  createBuildQuoteNavDetails: jest.fn(),
}));
jest.mock('../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../reducers/fiatOrders'),
  getRampRoutingDecision: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockCreateSellNavigationDetails =
  createSellNavigationDetails as jest.MockedFunction<
    typeof createSellNavigationDetails
  >;
const mockCreateDepositNavigationDetails =
  createDepositNavigationDetails as jest.MockedFunction<
    typeof createDepositNavigationDetails
  >;
const mockCreateTokenSelectionNavigationDetails =
  createTokenSelectionNavDetails as jest.MockedFunction<
    typeof createTokenSelectionNavDetails
  >;
const mockCreateBuildQuoteNavDetails =
  createBuildQuoteNavDetails as jest.MockedFunction<
    typeof createBuildQuoteNavDetails
  >;
const mockGetRampRoutingDecision =
  getRampRoutingDecision as jest.MockedFunction<typeof getRampRoutingDecision>;

describe('useRampNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);

    mockGetRampRoutingDecision.mockReturnValue(null);
    mockCreateSellNavigationDetails.mockReturnValue([
      Routes.RAMP.SELL,
    ] as unknown as ReturnType<typeof createSellNavigationDetails>);
    mockCreateDepositNavigationDetails.mockReturnValue([
      Routes.DEPOSIT.ID,
    ] as unknown as ReturnType<typeof createDepositNavigationDetails>);
    mockCreateTokenSelectionNavigationDetails.mockReturnValue([
      Routes.RAMP.TOKEN_SELECTION,
    ] as unknown as ReturnType<typeof createTokenSelectionNavDetails>);
    mockCreateBuildQuoteNavDetails.mockReturnValue([
      Routes.RAMP.TOKEN_SELECTION,
      {
        screen: Routes.RAMP.TOKEN_SELECTION,
        params: {
          screen: Routes.RAMP.AMOUNT_INPUT,
          params: { assetId: 'eip155:1/erc20:0x123' },
        },
      },
    ] as unknown as ReturnType<typeof createBuildQuoteNavDetails>);
  });

  describe('goToBuy', () => {
    it('navigates to BuildQuote when assetId is provided', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const mockNavDetails = [
        Routes.RAMP.TOKEN_SELECTION,
        {
          screen: Routes.RAMP.TOKEN_SELECTION,
          params: {
            screen: Routes.RAMP.AMOUNT_INPUT,
            params: { assetId: intent.assetId },
          },
        },
      ] as const;
      mockCreateBuildQuoteNavDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToBuy(intent);

      expect(mockSetSelectedToken).toHaveBeenCalledWith(intent.assetId);
      expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
        assetId: intent.assetId,
        buyFlowOrigin: undefined,
      });
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateSellNavigationDetails).not.toHaveBeenCalled();
      expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
    });

    it('passes buyFlowOrigin through to BuildQuote params', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToBuy(intent, { buyFlowOrigin: 'tokenInfo' });

      expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
        assetId: intent.assetId,
        buyFlowOrigin: 'tokenInfo',
      });
    });

    it('navigates to TokenSelection when no assetId is provided', () => {
      const mockNavDetails = [Routes.RAMP.TOKEN_SELECTION, undefined] as const;
      mockCreateTokenSelectionNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToBuy();

      expect(mockSetSelectedToken).not.toHaveBeenCalled();
      expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      expect(mockCreateTokenSelectionNavigationDetails).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateSellNavigationDetails).not.toHaveBeenCalled();
    });

    it('navigates to eligibility failed modal when routing decision is ERROR', () => {
      mockGetRampRoutingDecision.mockReturnValue(UnifiedRampRoutingType.ERROR);
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const navDetails = createEligibilityFailedModalNavigationDetails();

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToBuy(intent);

      expect(mockSetSelectedToken).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
      expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
    });

    it('navigates to unsupported modal when routing decision is UNSUPPORTED', () => {
      mockGetRampRoutingDecision.mockReturnValue(
        UnifiedRampRoutingType.UNSUPPORTED,
      );
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const navDetails = createRampUnsupportedModalNavigationDetails();

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToBuy(intent);

      expect(mockSetSelectedToken).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
      expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
    });

    it('bypasses guard modals when overrideUnifiedRouting is true', () => {
      mockGetRampRoutingDecision.mockReturnValue(UnifiedRampRoutingType.ERROR);
      const intent = { assetId: 'eip155:1/erc20:0x123' };

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToBuy(intent, { overrideUnifiedRouting: true });

      expect(mockSetSelectedToken).toHaveBeenCalledWith(intent.assetId);
      expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
        assetId: intent.assetId,
        buyFlowOrigin: undefined,
      });
      expect(mockCreateSellNavigationDetails).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        ...mockCreateBuildQuoteNavDetails.mock.results[0].value,
      );
    });
  });

  describe('goToAggregator', () => {
    it('navigates to unified buy token selection', () => {
      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToAggregator();

      expect(mockCreateTokenSelectionNavigationDetails).toHaveBeenCalled();
      expect(mockCreateSellNavigationDetails).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        ...mockCreateTokenSelectionNavigationDetails.mock.results[0].value,
      );
      expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
    });
  });

  describe('goToSell', () => {
    it('navigates to aggregator SELL flow', () => {
      mockGetRampRoutingDecision.mockReturnValue(
        UnifiedRampRoutingType.DEPOSIT,
      );
      const mockNavDetails = [Routes.RAMP.SELL] as const;
      mockCreateSellNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToSell();

      expect(mockCreateSellNavigationDetails).toHaveBeenCalledWith(undefined);
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
    });

    it('navigates to aggregator SELL with intent', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const mockNavDetails = [Routes.RAMP.SELL] as const;
      mockCreateSellNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToSell(intent);

      expect(mockCreateSellNavigationDetails).toHaveBeenCalledWith(intent);
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });
  });

  describe('goToDeposit', () => {
    it('navigates to deposit flow', () => {
      mockGetRampRoutingDecision.mockReturnValue(
        UnifiedRampRoutingType.AGGREGATOR,
      );
      const mockNavDetails = [Routes.DEPOSIT.ID] as const;
      mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToDeposit();

      expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(
        undefined,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });
  });
});
