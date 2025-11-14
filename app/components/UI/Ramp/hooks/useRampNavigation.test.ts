import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { useRampNavigation, RampMode } from './useRampNavigation';
import { createRampNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import { RampType as AggregatorRampType } from '../Aggregator/types';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';
import { UnifiedRampRoutingType } from '../../../../reducers/fiatOrders';

jest.mock('@react-navigation/native');
jest.mock('../Aggregator/routes/utils');
jest.mock('../Deposit/routes/utils');
jest.mock('./useRampsUnifiedV1Enabled');

const mockNavigate = jest.fn();
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRampsUnifiedV1Enabled =
  useRampsUnifiedV1Enabled as jest.MockedFunction<
    typeof useRampsUnifiedV1Enabled
  >;

let mockRampRoutingDecision: UnifiedRampRoutingType | null = null;

describe('useRampNavigation', () => {
  const mockCreateRampNavigationDetails =
    createRampNavigationDetails as jest.MockedFunction<
      typeof createRampNavigationDetails
    >;
  const mockCreateDepositNavigationDetails =
    createDepositNavigationDetails as jest.MockedFunction<
      typeof createDepositNavigationDetails
    >;

  const createMockState = () => ({
    fiatOrders: {
      rampRoutingDecision: mockRampRoutingDecision,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockRampRoutingDecision = null;

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);

    mockUseRampsUnifiedV1Enabled.mockReturnValue(false);

    mockCreateRampNavigationDetails.mockReturnValue([
      Routes.RAMP.BUY,
    ] as unknown as ReturnType<typeof createRampNavigationDetails>);

    mockCreateDepositNavigationDetails.mockReturnValue([
      Routes.DEPOSIT.ID,
    ] as unknown as ReturnType<typeof createDepositNavigationDetails>);
  });

  describe('RampMode.AGGREGATOR', () => {
    it('navigates to buy route when mode is AGGREGATOR without params (defaults to BUY)', () => {
      const mockNavDetails = [Routes.RAMP.BUY] as const;
      mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation(), {
        state: createMockState(),
      });

      result.current.goToRamps({ mode: RampMode.AGGREGATOR });

      expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
        AggregatorRampType.BUY,
        undefined,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
    });

    it('navigates to buy route when mode is AGGREGATOR with rampType BUY', () => {
      const mockNavDetails = [Routes.RAMP.BUY] as const;
      mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation(), {
        state: createMockState(),
      });

      result.current.goToRamps({
        mode: RampMode.AGGREGATOR,
        params: {
          rampType: AggregatorRampType.BUY,
        },
      });

      expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
        AggregatorRampType.BUY,
        undefined,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });

    it('navigates to sell route when mode is AGGREGATOR with rampType SELL', () => {
      const mockNavDetails = [Routes.RAMP.SELL] as const;
      mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation(), {
        state: createMockState(),
      });

      result.current.goToRamps({
        mode: RampMode.AGGREGATOR,
        params: {
          rampType: AggregatorRampType.SELL,
        },
      });

      expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
        AggregatorRampType.SELL,
        undefined,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });

    it('passes intent to createRampNavigationDetails when provided for BUY', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const mockNavDetails = [Routes.RAMP.BUY] as const;
      mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation(), {
        state: createMockState(),
      });

      result.current.goToRamps({
        mode: RampMode.AGGREGATOR,
        params: {
          intent,
          rampType: AggregatorRampType.BUY,
        },
      });

      expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
        AggregatorRampType.BUY,
        intent,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });

    it('passes intent to createRampNavigationDetails when provided for SELL', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const mockNavDetails = [Routes.RAMP.SELL] as const;
      mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation(), {
        state: createMockState(),
      });

      result.current.goToRamps({
        mode: RampMode.AGGREGATOR,
        params: {
          intent,
          rampType: AggregatorRampType.SELL,
        },
      });

      expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
        AggregatorRampType.SELL,
        intent,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });
  });

  describe('RampMode.DEPOSIT', () => {
    it('navigates to deposit route when mode is DEPOSIT without params', () => {
      const mockNavDetails = [Routes.DEPOSIT.ID] as const;
      mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation(), {
        state: createMockState(),
      });

      result.current.goToRamps({ mode: RampMode.DEPOSIT });

      expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(
        undefined,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
    });

    it('passes params to createDepositNavigationDetails when provided', () => {
      const params = { assetId: 'eip155:1/erc20:0x123', amount: '100' };
      const mockNavDetails = [Routes.DEPOSIT.ID] as const;
      mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderHookWithProvider(() => useRampNavigation(), {
        state: createMockState(),
      });

      result.current.goToRamps({ mode: RampMode.DEPOSIT, params });

      expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(params);
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });
  });

  describe('when unified V1 is enabled', () => {
    beforeEach(() => {
      mockUseRampsUnifiedV1Enabled.mockReturnValue(true);
    });

    describe('smart routing based on routing decision', () => {
      it('navigates to deposit when routing decision is DEPOSIT and mode is AGGREGATOR and params specify BUY', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.DEPOSIT;
        const mockNavDetails = [Routes.DEPOSIT.ID] as const;
        mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.AGGREGATOR,
          params: {
            rampType: AggregatorRampType.BUY,
          },
        });

        expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(
          undefined,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
      });

      it('navigates to deposit when routing decision is DEPOSIT and mode is AGGREGATOR and params are not present', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.DEPOSIT;
        const mockNavDetails = [Routes.DEPOSIT.ID] as const;
        mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({ mode: RampMode.AGGREGATOR });

        expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(
          undefined,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
      });

      it('navigates to aggregator when routing decision is DEPOSIT and params specify SELL', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.DEPOSIT;
        const mockNavDetails = [Routes.RAMP.BUY] as const;
        mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.AGGREGATOR,
          params: {
            rampType: AggregatorRampType.SELL,
          },
        });

        expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalledWith(
          undefined,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateRampNavigationDetails).toHaveBeenCalled();
      });

      it('navigates to deposit with params when routing decision is DEPOSIT and mode is DEPOSIT', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.DEPOSIT;
        const params = { assetId: 'eip155:1/erc20:0x123', amount: '100' };
        const mockNavDetails = [Routes.DEPOSIT.ID] as const;
        mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({ mode: RampMode.DEPOSIT, params });

        expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(params);
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });

      it('navigates to aggregator when routing decision is AGGREGATOR', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.AGGREGATOR;
        const mockNavDetails = [Routes.RAMP.BUY] as const;
        mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({ mode: RampMode.DEPOSIT });

        expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
          AggregatorRampType.BUY,
          undefined,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
      });

      it('navigates to aggregator with BUY when routing decision is AGGREGATOR and params specify BUY', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.AGGREGATOR;
        const mockNavDetails = [Routes.RAMP.BUY] as const;
        mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.AGGREGATOR,
          params: {
            rampType: AggregatorRampType.BUY,
          },
        });

        expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
          AggregatorRampType.BUY,
          undefined,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });

      it('navigates to aggregator with SELL when routing decision is AGGREGATOR and params specify SELL', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.AGGREGATOR;
        const mockNavDetails = [Routes.RAMP.SELL] as const;
        mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.AGGREGATOR,
          params: {
            rampType: AggregatorRampType.SELL,
          },
        });

        expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
          AggregatorRampType.SELL,
          undefined,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });

      it('navigates to aggregator with intent when routing decision is AGGREGATOR and intent is provided', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.AGGREGATOR;
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const mockNavDetails = [Routes.RAMP.BUY] as const;
        mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.AGGREGATOR,
          params: {
            intent,
            rampType: AggregatorRampType.BUY,
          },
        });

        expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
          AggregatorRampType.BUY,
          intent,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });

      it('navigates to aggregator when routing decision is UNSUPPORTED (defaults to aggregator)', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.UNSUPPORTED;
        const mockNavDetails = [Routes.RAMP.BUY] as const;
        mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({ mode: RampMode.AGGREGATOR });

        expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
          AggregatorRampType.BUY,
          undefined,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });

      it('navigates to aggregator when routing decision is ERROR (defaults to aggregator)', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.ERROR;
        const mockNavDetails = [Routes.RAMP.BUY] as const;
        mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({ mode: RampMode.AGGREGATOR });

        expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
          AggregatorRampType.BUY,
          undefined,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });

      it('navigates to aggregator when routing decision is null (defaults to aggregator)', () => {
        mockRampRoutingDecision = null;
        const mockNavDetails = [Routes.RAMP.BUY] as const;
        mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({ mode: RampMode.AGGREGATOR });

        expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
          AggregatorRampType.BUY,
          undefined,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });
    });

    describe('overrideUnifiedBuyFlag', () => {
      it('uses original navigation logic when overrideUnifiedBuyFlag is true', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.DEPOSIT;
        const mockNavDetails = [Routes.RAMP.BUY] as const;
        mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.AGGREGATOR,
          overrideUnifiedBuyFlag: true,
        });

        expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
          AggregatorRampType.BUY,
          undefined,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
      });

      it('uses original navigation logic for DEPOSIT mode when overrideUnifiedBuyFlag is true', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.AGGREGATOR;
        const params = { assetId: 'eip155:1/erc20:0x123', amount: '100' };
        const mockNavDetails = [Routes.DEPOSIT.ID] as const;
        mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.DEPOSIT,
          params,
          overrideUnifiedBuyFlag: true,
        });

        expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(params);
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
      });
    });
  });
});
