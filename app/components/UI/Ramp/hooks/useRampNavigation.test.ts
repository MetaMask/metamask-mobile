import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { useRampNavigation } from './useRampNavigation';
import { createRampNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import { createTokenSelectionNavDetails } from '../components/TokenSelection/TokenSelection';
import { RampType as AggregatorRampType } from '../Aggregator/types';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';
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
jest.mock('./useRampsUnifiedV1Enabled');
jest.mock('../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../reducers/fiatOrders'),
  getRampRoutingDecision: jest.fn(),
}));
jest.mock('../components/EligibilityFailedModal/EligibilityFailedModal');
jest.mock('../components/RampUnsupportedModal/RampUnsupportedModal');

const mockNavigate = jest.fn();
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRampsUnifiedV1Enabled =
  useRampsUnifiedV1Enabled as jest.MockedFunction<
    typeof useRampsUnifiedV1Enabled
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
const mockGetRampRoutingDecision =
  getRampRoutingDecision as jest.MockedFunction<typeof getRampRoutingDecision>;
const mockCreateEligibilityFailedModalNavigationDetails =
  createEligibilityFailedModalNavigationDetails as jest.MockedFunction<
    typeof createEligibilityFailedModalNavigationDetails
  >;
const mockCreateRampUnsupportedModalNavigationDetails =
  createRampUnsupportedModalNavigationDetails as jest.MockedFunction<
    typeof createRampUnsupportedModalNavigationDetails
  >;

describe('useRampNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);

    mockUseRampsUnifiedV1Enabled.mockReturnValue(false);

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

    mockCreateEligibilityFailedModalNavigationDetails.mockReturnValue([
      Routes.MODAL.ROOT_MODAL_FLOW,
      Routes.SHEET.ELIGIBILITY_FAILED_MODAL,
    ] as unknown as ReturnType<
      typeof createEligibilityFailedModalNavigationDetails
    >);

    mockCreateRampUnsupportedModalNavigationDetails.mockReturnValue([
      Routes.MODAL.ROOT_MODAL_FLOW,
      Routes.SHEET.UNSUPPORTED_REGION_MODAL,
    ] as unknown as ReturnType<
      typeof createRampUnsupportedModalNavigationDetails
    >);
  });

  describe('goToBuy', () => {
    describe('error and unsupported routing', () => {
      it('navigates to eligibility failed modal when routing decision is ERROR', () => {
        mockGetRampRoutingDecision.mockReturnValue(
          UnifiedRampRoutingType.ERROR,
        );
        const mockNavDetails = [
          Routes.MODAL.ROOT_MODAL_FLOW,
          Routes.SHEET.ELIGIBILITY_FAILED_MODAL,
        ] as unknown as ReturnType<
          typeof createEligibilityFailedModalNavigationDetails
        >;
        mockCreateEligibilityFailedModalNavigationDetails.mockReturnValue(
          mockNavDetails,
        );

        const { result } = renderHookWithProvider(() => useRampNavigation());

        result.current.goToBuy();

        expect(
          mockCreateEligibilityFailedModalNavigationDetails,
        ).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
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
        const mockNavDetails = [
          Routes.MODAL.ROOT_MODAL_FLOW,
          Routes.SHEET.ELIGIBILITY_FAILED_MODAL,
        ] as unknown as ReturnType<
          typeof createEligibilityFailedModalNavigationDetails
        >;
        mockCreateEligibilityFailedModalNavigationDetails.mockReturnValue(
          mockNavDetails,
        );

        const { result } = renderHookWithProvider(() => useRampNavigation());

        result.current.goToBuy(intent);

        expect(
          mockCreateEligibilityFailedModalNavigationDetails,
        ).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
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
        const mockNavDetails = [
          Routes.MODAL.ROOT_MODAL_FLOW,
          Routes.SHEET.UNSUPPORTED_REGION_MODAL,
        ] as unknown as ReturnType<
          typeof createRampUnsupportedModalNavigationDetails
        >;
        mockCreateRampUnsupportedModalNavigationDetails.mockReturnValue(
          mockNavDetails,
        );

        const { result } = renderHookWithProvider(() => useRampNavigation());

        result.current.goToBuy();

        expect(
          mockCreateRampUnsupportedModalNavigationDetails,
        ).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
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
        const mockNavDetails = [
          Routes.MODAL.ROOT_MODAL_FLOW,
          Routes.SHEET.UNSUPPORTED_REGION_MODAL,
        ] as unknown as ReturnType<
          typeof createRampUnsupportedModalNavigationDetails
        >;
        mockCreateRampUnsupportedModalNavigationDetails.mockReturnValue(
          mockNavDetails,
        );

        const { result } = renderHookWithProvider(() => useRampNavigation());

        result.current.goToBuy(intent);

        expect(
          mockCreateRampUnsupportedModalNavigationDetails,
        ).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
        expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
        expect(
          mockCreateTokenSelectionNavigationDetails,
        ).not.toHaveBeenCalled();
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
