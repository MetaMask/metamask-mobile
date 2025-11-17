import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { useRampNavigation, RampMode } from './useRampNavigation';
import { RampType as AggregatorRampType } from '../Aggregator/types';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';
import { UnifiedRampRoutingType } from '../../../../reducers/fiatOrders';

jest.mock('@react-navigation/native');
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
  });

  describe('RampMode.AGGREGATOR', () => {
    it('navigates to buy route when mode is AGGREGATOR without params (defaults to BUY)', () => {
      const { result } = renderHookWithProvider(() => useRampNavigation(), {
        state: createMockState(),
      });

      result.current.goToRamps({ mode: RampMode.AGGREGATOR });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
    });

    it('navigates to buy route when mode is AGGREGATOR with rampType BUY', () => {
      const { result } = renderHookWithProvider(() => useRampNavigation(), {
        state: createMockState(),
      });

      result.current.goToRamps({
        mode: RampMode.AGGREGATOR,
        params: {
          rampType: AggregatorRampType.BUY,
        },
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
    });

    it('navigates to sell route when mode is AGGREGATOR with rampType SELL', () => {
      const { result } = renderHookWithProvider(() => useRampNavigation(), {
        state: createMockState(),
      });

      result.current.goToRamps({
        mode: RampMode.AGGREGATOR,
        params: {
          rampType: AggregatorRampType.SELL,
        },
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.SELL);
    });

    it('passes intent to navigation when provided for BUY', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };

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

      expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY, {
        screen: expect.any(String),
        params: {
          screen: expect.any(String),
          params: intent,
        },
      });
    });

    it('passes intent to navigation when provided for SELL', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };

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

      expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.SELL, {
        screen: expect.any(String),
        params: {
          screen: expect.any(String),
          params: intent,
        },
      });
    });
  });

  describe('RampMode.DEPOSIT', () => {
    it('navigates to deposit route when mode is DEPOSIT without params', () => {
      const { result } = renderHookWithProvider(() => useRampNavigation(), {
        state: createMockState(),
      });

      result.current.goToRamps({ mode: RampMode.DEPOSIT });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID);
    });

    it('passes params to navigation when provided', () => {
      const params = { assetId: 'eip155:1/erc20:0x123', amount: '100' };

      const { result } = renderHookWithProvider(() => useRampNavigation(), {
        state: createMockState(),
      });

      result.current.goToRamps({ mode: RampMode.DEPOSIT, params });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID, {
        screen: Routes.DEPOSIT.ID,
        params,
      });
    });
  });

  describe('when unified V1 is enabled', () => {
    beforeEach(() => {
      mockUseRampsUnifiedV1Enabled.mockReturnValue(true);
    });

    describe('smart routing based on routing decision', () => {
      it('navigates to deposit when routing decision is DEPOSIT and mode is AGGREGATOR and params specify BUY', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.DEPOSIT;

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.AGGREGATOR,
          params: {
            rampType: AggregatorRampType.BUY,
          },
        });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID);
      });

      it('navigates to deposit when routing decision is DEPOSIT and mode is AGGREGATOR and params are not present', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.DEPOSIT;

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({ mode: RampMode.AGGREGATOR });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID);
      });

      it('navigates to aggregator when routing decision is DEPOSIT and params specify SELL', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.DEPOSIT;

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.AGGREGATOR,
          params: {
            rampType: AggregatorRampType.SELL,
          },
        });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.SELL);
      });

      it('navigates to deposit with params when routing decision is DEPOSIT and mode is DEPOSIT', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.DEPOSIT;
        const params = { assetId: 'eip155:1/erc20:0x123', amount: '100' };

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({ mode: RampMode.DEPOSIT, params });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID, {
          screen: Routes.DEPOSIT.ID,
          params,
        });
      });

      it('navigates to aggregator when routing decision is AGGREGATOR', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.AGGREGATOR;

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({ mode: RampMode.DEPOSIT });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
      });

      it('navigates to aggregator with BUY when routing decision is AGGREGATOR and params specify BUY', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.AGGREGATOR;

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.AGGREGATOR,
          params: {
            rampType: AggregatorRampType.BUY,
          },
        });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
      });

      it('navigates to aggregator with SELL when routing decision is AGGREGATOR and params specify SELL', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.AGGREGATOR;

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.AGGREGATOR,
          params: {
            rampType: AggregatorRampType.SELL,
          },
        });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.SELL);
      });

      it('navigates to aggregator with intent when routing decision is AGGREGATOR and intent is provided', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.AGGREGATOR;
        const intent = { assetId: 'eip155:1/erc20:0x123' };

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

        expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY, {
          screen: expect.any(String),
          params: {
            screen: expect.any(String),
            params: intent,
          },
        });
      });

      it('navigates to aggregator when routing decision is UNSUPPORTED (defaults to aggregator)', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.UNSUPPORTED;

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({ mode: RampMode.AGGREGATOR });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
      });

      it('navigates to aggregator when routing decision is ERROR (defaults to aggregator)', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.ERROR;

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({ mode: RampMode.AGGREGATOR });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
      });

      it('navigates to aggregator when routing decision is null (defaults to aggregator)', () => {
        mockRampRoutingDecision = null;

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({ mode: RampMode.AGGREGATOR });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
      });
    });

    describe('overrideUnifiedBuyFlag', () => {
      it('uses original navigation logic when overrideUnifiedBuyFlag is true', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.DEPOSIT;

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.AGGREGATOR,
          overrideUnifiedBuyFlag: true,
        });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
      });

      it('uses original navigation logic for DEPOSIT mode when overrideUnifiedBuyFlag is true', () => {
        mockRampRoutingDecision = UnifiedRampRoutingType.AGGREGATOR;
        const params = { assetId: 'eip155:1/erc20:0x123', amount: '100' };

        const { result } = renderHookWithProvider(() => useRampNavigation(), {
          state: createMockState(),
        });

        result.current.goToRamps({
          mode: RampMode.DEPOSIT,
          params,
          overrideUnifiedBuyFlag: true,
        });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID, {
          screen: Routes.DEPOSIT.ID,
          params,
        });
      });
    });
  });
});
