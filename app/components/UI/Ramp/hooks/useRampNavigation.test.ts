import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { useRampNavigation } from './useRampNavigation';
import { createRampNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import { createTokenSelectionNavDetails } from '../components/TokenSelection/TokenSelection';
import { createBuildQuoteNavDetails } from '../components/BuildQuote';
import { RampType as AggregatorRampType } from '../Aggregator/types';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';
import useRampsUnifiedV2Enabled from './useRampsUnifiedV2Enabled';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders';
import { createEligibilityFailedModalNavigationDetails } from '../components/EligibilityFailedModal/EligibilityFailedModal';
import { createRampUnsupportedModalNavigationDetails } from '../components/RampUnsupportedModal/RampUnsupportedModal';

jest.mock('@react-navigation/native');
jest.mock('@react-navigation/compat', () => ({
  withNavigation: jest.fn((component) => component),
}));
jest.mock('../Aggregator/routes/utils');
jest.mock('../Deposit/routes/utils');
jest.mock('../components/TokenSelection/TokenSelection', () => {
  const actual = jest.requireActual(
    '../components/TokenSelection/TokenSelection',
  );
  const mockFn = jest.fn();
  return {
    ...actual,
    createTokenSelectionNavDetails: mockFn,
    createTokenSelectionNavigationDetails: mockFn, // Alias for hook compatibility
  };
});
jest.mock('../components/BuildQuote', () => {
  const mockFn = jest.fn();
  return {
    createBuildQuoteNavDetails: mockFn,
  };
});
jest.mock('./useRampsUnifiedV1Enabled');
jest.mock('./useRampsUnifiedV2Enabled');
jest.mock('../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../reducers/fiatOrders'),
  getRampRoutingDecision: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRampsUnifiedV1Enabled =
  useRampsUnifiedV1Enabled as jest.MockedFunction<
    typeof useRampsUnifiedV1Enabled
  >;
const mockUseRampsUnifiedV2Enabled =
  useRampsUnifiedV2Enabled as jest.MockedFunction<
    typeof useRampsUnifiedV2Enabled
  >;
const mockCreateRampNavigationDetails =
  createRampNavigationDetails as jest.MockedFunction<
    typeof createRampNavigationDetails
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

    mockUseRampsUnifiedV1Enabled.mockReturnValue(false);
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);

    mockGetRampRoutingDecision.mockReturnValue(null);

    mockCreateRampNavigationDetails.mockReturnValue([
      Routes.RAMP.BUY,
    ] as unknown as ReturnType<typeof createRampNavigationDetails>);

    mockCreateDepositNavigationDetails.mockReturnValue([
      Routes.DEPOSIT.ID,
    ] as unknown as ReturnType<typeof createDepositNavigationDetails>);

    mockCreateTokenSelectionNavigationDetails.mockReturnValue([
      Routes.RAMP.TOKEN_SELECTION,
    ] as unknown as ReturnType<typeof createTokenSelectionNavDetails>);

    mockCreateBuildQuoteNavDetails.mockReturnValue([
      Routes.RAMP.AMOUNT_INPUT,
      { assetId: 'eip155:1/erc20:0x123' },
    ] as unknown as ReturnType<typeof createBuildQuoteNavDetails>);
  });

  describe('goToBuy', () => {
    describe('when unified V2 is enabled', () => {
      beforeEach(() => {
        mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
      });

      it('navigates to BuildQuote when assetId is provided', () => {
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const mockNavDetails = [
          Routes.RAMP.AMOUNT_INPUT,
          { assetId: intent.assetId },
        ] as const;
        mockCreateBuildQuoteNavDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation());

        result.current.goToBuy(intent);

        expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
          assetId: intent.assetId,
        });
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
        expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
      });

      it('does not navigate to BuildQuote when assetId is not provided', () => {
        mockUseRampsUnifiedV1Enabled.mockReturnValue(true);
        const mockNavDetails = [
          Routes.RAMP.TOKEN_SELECTION,
          undefined,
        ] as const;
        mockCreateTokenSelectionNavigationDetails.mockReturnValue(
          mockNavDetails,
        );

        const { result } = renderHookWithProvider(() => useRampNavigation());

        result.current.goToBuy();

        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
        expect(mockCreateTokenSelectionNavigationDetails).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });

      it('does not navigate to BuildQuote when overrideUnifiedRouting is true', () => {
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const mockNavDetails = [Routes.RAMP.BUY] as const;
        mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation());

        result.current.goToBuy(intent, { overrideUnifiedRouting: true });

        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
        expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
          AggregatorRampType.BUY,
          intent,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });

      it('takes precedence over V1 routing when V2 is enabled with assetId', () => {
        mockUseRampsUnifiedV1Enabled.mockReturnValue(true);
        mockGetRampRoutingDecision.mockReturnValue(
          UnifiedRampRoutingType.DEPOSIT,
        );
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const mockNavDetails = [
          Routes.RAMP.AMOUNT_INPUT,
          { assetId: intent.assetId },
        ] as const;
        mockCreateBuildQuoteNavDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation());

        result.current.goToBuy(intent);

        expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
          assetId: intent.assetId,
        });
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
      });

      describe('error and unsupported routing takes precedence over V2', () => {
        it('navigates to eligibility failed modal when routing decision is ERROR', () => {
          mockGetRampRoutingDecision.mockReturnValue(
            UnifiedRampRoutingType.ERROR,
          );
          const intent = { assetId: 'eip155:1/erc20:0x123' };
          const navDetails = createEligibilityFailedModalNavigationDetails();

          const { result } = renderHookWithProvider(() => useRampNavigation());

          result.current.goToBuy(intent);

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

          expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
          expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
        });
      });
    });

    describe('when unified V1 is disabled', () => {
      it('navigates to aggregator BUY without intent', () => {
        const mockNavDetails = [Routes.RAMP.BUY] as const;
        mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation());

        result.current.goToBuy();

        expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
          AggregatorRampType.BUY,
          undefined,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });

      it('navigates to aggregator with intent', () => {
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const mockNavDetails = [Routes.RAMP.BUY] as const;
        mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation());

        result.current.goToBuy(intent);

        expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
          AggregatorRampType.BUY,
          intent,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });
    });

    describe('when unified V1 is enabled', () => {
      beforeEach(() => {
        mockUseRampsUnifiedV1Enabled.mockReturnValue(true);
      });

      describe('error and unsupported routing', () => {
        it('navigates to eligibility failed modal when routing decision is ERROR', () => {
          mockGetRampRoutingDecision.mockReturnValue(
            UnifiedRampRoutingType.ERROR,
          );
          const navDetails = createEligibilityFailedModalNavigationDetails();

          const { result } = renderHookWithProvider(() => useRampNavigation());

          result.current.goToBuy();

          expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
          expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
          expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
          expect(
            mockCreateTokenSelectionNavigationDetails,
          ).not.toHaveBeenCalled();
        });

        it('navigates to eligibility failed modal when routing decision is ERROR with intent', () => {
          mockGetRampRoutingDecision.mockReturnValue(
            UnifiedRampRoutingType.ERROR,
          );
          const intent = { assetId: 'eip155:1/erc20:0x123' };
          const navDetails = createEligibilityFailedModalNavigationDetails();

          const { result } = renderHookWithProvider(() => useRampNavigation());

          result.current.goToBuy(intent);

          expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
          expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
          expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
          expect(
            mockCreateTokenSelectionNavigationDetails,
          ).not.toHaveBeenCalled();
        });

        it('navigates to unsupported modal when routing decision is UNSUPPORTED', () => {
          mockGetRampRoutingDecision.mockReturnValue(
            UnifiedRampRoutingType.UNSUPPORTED,
          );
          const navDetails = createRampUnsupportedModalNavigationDetails();

          const { result } = renderHookWithProvider(() => useRampNavigation());

          result.current.goToBuy();

          expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
          expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
          expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
          expect(
            mockCreateTokenSelectionNavigationDetails,
          ).not.toHaveBeenCalled();
        });

        it('navigates to unsupported modal when routing decision is UNSUPPORTED with intent', () => {
          mockGetRampRoutingDecision.mockReturnValue(
            UnifiedRampRoutingType.UNSUPPORTED,
          );
          const intent = { assetId: 'eip155:1/erc20:0x123' };
          const navDetails = createRampUnsupportedModalNavigationDetails();

          const { result } = renderHookWithProvider(() => useRampNavigation());

          result.current.goToBuy(intent);

          expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
          expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
          expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
          expect(
            mockCreateTokenSelectionNavigationDetails,
          ).not.toHaveBeenCalled();
        });
      });

      describe('token selection routing', () => {
        it('navigates to TokenSelection when no assetId is provided', () => {
          const mockNavDetails = [
            Routes.RAMP.TOKEN_SELECTION,
            undefined,
          ] as const;
          mockCreateTokenSelectionNavigationDetails.mockReturnValue(
            mockNavDetails,
          );

          const { result } = renderHookWithProvider(() => useRampNavigation());

          result.current.goToBuy();

          expect(mockCreateTokenSelectionNavigationDetails).toHaveBeenCalled();
          expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
          expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
          expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
        });

        it('navigates to TokenSelection when intent is provided without assetId', () => {
          const intent = { amount: '100', currency: 'USD' };
          const mockNavDetails = [
            Routes.RAMP.TOKEN_SELECTION,
            undefined,
          ] as const;
          mockCreateTokenSelectionNavigationDetails.mockReturnValue(
            mockNavDetails,
          );

          const { result } = renderHookWithProvider(() => useRampNavigation());

          result.current.goToBuy(intent);

          expect(mockCreateTokenSelectionNavigationDetails).toHaveBeenCalled();
          expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        });
      });

      describe('smart routing based on routing decision', () => {
        const intent = { assetId: 'eip155:1/erc20:0x123' };

        it('navigates to TokenSelection when routing decision is null', () => {
          mockGetRampRoutingDecision.mockReturnValue(null);
          const mockNavDetails = [
            Routes.RAMP.TOKEN_SELECTION,
            undefined,
          ] as const;
          mockCreateTokenSelectionNavigationDetails.mockReturnValue(
            mockNavDetails,
          );

          const { result } = renderHookWithProvider(() => useRampNavigation());

          result.current.goToBuy(intent);

          expect(mockCreateTokenSelectionNavigationDetails).toHaveBeenCalled();
          expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
          expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
          expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
        });

        it('navigates to deposit when routing decision is DEPOSIT', () => {
          mockGetRampRoutingDecision.mockReturnValue(
            UnifiedRampRoutingType.DEPOSIT,
          );
          const mockNavDetails = [Routes.DEPOSIT.ID] as const;
          mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

          const { result } = renderHookWithProvider(() => useRampNavigation());

          result.current.goToBuy(intent);

          expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(
            intent,
          );
          expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
          expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
        });

        it('navigates to aggregator when routing decision is AGGREGATOR', () => {
          mockGetRampRoutingDecision.mockReturnValue(
            UnifiedRampRoutingType.AGGREGATOR,
          );
          const mockNavDetails = [Routes.RAMP.BUY] as const;
          mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

          const { result } = renderHookWithProvider(() => useRampNavigation());

          result.current.goToBuy(intent);

          expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
            AggregatorRampType.BUY,
            intent,
          );
          expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
          expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('goToAggregator', () => {
    it('navigates to aggregator BUY flow (overrides unified routing)', () => {
      mockUseRampsUnifiedV1Enabled.mockReturnValue(true);
      mockGetRampRoutingDecision.mockReturnValue(
        UnifiedRampRoutingType.DEPOSIT,
      );
      const mockNavDetails = [Routes.RAMP.BUY] as const;
      mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToAggregator();

      expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
        AggregatorRampType.BUY,
        undefined,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
    });

    it('navigates to aggregator BUY with intent', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const mockNavDetails = [Routes.RAMP.BUY] as const;
      mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToAggregator(intent);

      expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
        AggregatorRampType.BUY,
        intent,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });
  });

  describe('goToSell', () => {
    it('navigates to aggregator SELL flow (overrides unified routing)', () => {
      mockUseRampsUnifiedV1Enabled.mockReturnValue(true);
      mockGetRampRoutingDecision.mockReturnValue(
        UnifiedRampRoutingType.DEPOSIT,
      );
      const mockNavDetails = [Routes.RAMP.SELL] as const;
      mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToSell();

      expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
        AggregatorRampType.SELL,
        undefined,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
    });

    it('navigates to aggregator SELL with intent', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const mockNavDetails = [Routes.RAMP.SELL] as const;
      mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation());
      result.current.goToSell(intent);

      expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
        AggregatorRampType.SELL,
        intent,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });
  });

  describe('goToDeposit', () => {
    it('navigates to deposit flow (overrides unified routing)', () => {
      mockUseRampsUnifiedV1Enabled.mockReturnValue(true);
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

    it('navigates to deposit with intent', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const mockNavDetails = [Routes.DEPOSIT.ID] as const;
      mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation());

      result.current.goToDeposit(intent);

      expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(intent);
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });
  });
});
