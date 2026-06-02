import Routes from '../../../../constants/navigation/Routes';
import { navigateToRampBuy, NavigateToRampBuyMode } from './navigateToRampBuy';
import { createRampNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import { createTokenSelectionNavDetails } from '../Views/TokenSelection/TokenSelection';
import { createBuildQuoteNavDetails } from '../Views/BuildQuote';
import { RampType as AggregatorRampType } from '../Aggregator/types';
import { UnifiedRampRoutingType } from '../../../../reducers/fiatOrders';
import { createEligibilityFailedModalNavigationDetails } from '../components/EligibilityFailedModal/EligibilityFailedModal';
import { createRampUnsupportedModalNavigationDetails } from '../components/RampUnsupportedModal/RampUnsupportedModal';

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
jest.mock('../Views/BuildQuote', () => {
  const mockFn = jest.fn();
  return {
    createBuildQuoteNavDetails: mockFn,
  };
});

const mockNavigate = jest.fn();
const mockSetSelectedToken = jest.fn();

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

function navigate(
  intent: Parameters<typeof navigateToRampBuy>[1],
  options: Parameters<typeof navigateToRampBuy>[2],
  deps: Partial<Parameters<typeof navigateToRampBuy>[3]> & {
    isRampsUnifiedV1Enabled: boolean;
    isRampsUnifiedV2Enabled: boolean;
    rampRoutingDecision: Parameters<
      typeof navigateToRampBuy
    >[3]['rampRoutingDecision'];
  },
) {
  navigateToRampBuy({ navigate: mockNavigate }, intent, options, {
    rampsTokensAll: [],
    setSelectedToken: mockSetSelectedToken,
    ...deps,
  });
}

describe('navigateToRampBuy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetSelectedToken.mockClear();

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

  describe('when unified V2 is enabled', () => {
    const v2Deps = {
      isRampsUnifiedV1Enabled: false,
      isRampsUnifiedV2Enabled: true,
      rampRoutingDecision: null,
    };

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

      navigate(intent, undefined, v2Deps);

      expect(mockSetSelectedToken).toHaveBeenCalledWith(intent.assetId);
      expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
        assetId: intent.assetId,
        buyFlowOrigin: undefined,
      });
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
      expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
    });

    it('passes buyFlowOrigin through to BuildQuote params', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };

      navigate(intent, { buyFlowOrigin: 'tokenInfo' }, v2Deps);

      expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
        assetId: intent.assetId,
        buyFlowOrigin: 'tokenInfo',
      });
    });

    it('passes homeTokenList buyFlowOrigin through to BuildQuote params', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };

      navigate(intent, { buyFlowOrigin: 'homeTokenList' }, v2Deps);

      expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
        assetId: intent.assetId,
        buyFlowOrigin: 'homeTokenList',
      });
    });

    it('navigates to TokenSelection when no assetId and V1 is disabled', () => {
      const mockNavDetails = [Routes.RAMP.TOKEN_SELECTION, undefined] as const;
      mockCreateTokenSelectionNavigationDetails.mockReturnValue(mockNavDetails);

      navigate(undefined, undefined, v2Deps);

      expect(mockSetSelectedToken).not.toHaveBeenCalled();
      expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      expect(mockCreateTokenSelectionNavigationDetails).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
    });

    it('navigates to TokenSelection when no assetId and V1 is also enabled', () => {
      const mockNavDetails = [Routes.RAMP.TOKEN_SELECTION, undefined] as const;
      mockCreateTokenSelectionNavigationDetails.mockReturnValue(mockNavDetails);

      navigate(undefined, undefined, {
        ...v2Deps,
        isRampsUnifiedV1Enabled: true,
      });

      expect(mockSetSelectedToken).not.toHaveBeenCalled();
      expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      expect(mockCreateTokenSelectionNavigationDetails).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });

    it('does not navigate to BuildQuote when overrideUnifiedRouting is true', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const mockNavDetails = [Routes.RAMP.BUY] as const;
      mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

      navigate(intent, { overrideUnifiedRouting: true }, v2Deps);

      expect(mockSetSelectedToken).not.toHaveBeenCalled();
      expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
        AggregatorRampType.BUY,
        intent,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });

    it('takes precedence over V1 routing when V2 is enabled with assetId', () => {
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

      navigate(intent, undefined, {
        isRampsUnifiedV1Enabled: true,
        isRampsUnifiedV2Enabled: true,
        rampRoutingDecision: UnifiedRampRoutingType.DEPOSIT,
      });

      expect(mockSetSelectedToken).toHaveBeenCalledWith(intent.assetId);
      expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
        assetId: intent.assetId,
        buyFlowOrigin: undefined,
      });
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
    });

    describe('error and unsupported routing takes precedence over V2', () => {
      it('navigates to eligibility failed modal when routing decision is ERROR', () => {
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const navDetails = createEligibilityFailedModalNavigationDetails();

        navigate(intent, undefined, {
          ...v2Deps,
          rampRoutingDecision: UnifiedRampRoutingType.ERROR,
        });

        expect(mockSetSelectedToken).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      });

      it('navigates to unsupported modal when routing decision is UNSUPPORTED', () => {
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const navDetails = createRampUnsupportedModalNavigationDetails();

        navigate(intent, undefined, {
          ...v2Deps,
          rampRoutingDecision: UnifiedRampRoutingType.UNSUPPORTED,
        });

        expect(mockSetSelectedToken).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      });
    });
  });

  describe('when unified V1 is disabled', () => {
    const legacyDeps = {
      isRampsUnifiedV1Enabled: false,
      isRampsUnifiedV2Enabled: false,
      rampRoutingDecision: null,
    };

    it('navigates to aggregator BUY without intent', () => {
      const mockNavDetails = [Routes.RAMP.BUY] as const;
      mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

      navigate(undefined, undefined, legacyDeps);

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

      navigate(intent, undefined, legacyDeps);

      expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
        AggregatorRampType.BUY,
        intent,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });
  });

  describe('when unified V1 is enabled', () => {
    const v1Deps = {
      isRampsUnifiedV1Enabled: true,
      isRampsUnifiedV2Enabled: false,
      rampRoutingDecision: null as UnifiedRampRoutingType | null,
    };

    describe('error and unsupported routing', () => {
      it('navigates to eligibility failed modal when routing decision is ERROR', () => {
        const navDetails = createEligibilityFailedModalNavigationDetails();

        navigate(undefined, undefined, {
          ...v1Deps,
          rampRoutingDecision: UnifiedRampRoutingType.ERROR,
        });

        expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
        expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
        expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
        expect(
          mockCreateTokenSelectionNavigationDetails,
        ).not.toHaveBeenCalled();
      });

      it('navigates to eligibility failed modal when routing decision is ERROR with intent', () => {
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const navDetails = createEligibilityFailedModalNavigationDetails();

        navigate(intent, undefined, {
          ...v1Deps,
          rampRoutingDecision: UnifiedRampRoutingType.ERROR,
        });

        expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
        expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
        expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
        expect(
          mockCreateTokenSelectionNavigationDetails,
        ).not.toHaveBeenCalled();
      });

      it('navigates to unsupported modal when routing decision is UNSUPPORTED', () => {
        const navDetails = createRampUnsupportedModalNavigationDetails();

        navigate(undefined, undefined, {
          ...v1Deps,
          rampRoutingDecision: UnifiedRampRoutingType.UNSUPPORTED,
        });

        expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
        expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
        expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
        expect(
          mockCreateTokenSelectionNavigationDetails,
        ).not.toHaveBeenCalled();
      });

      it('navigates to unsupported modal when routing decision is UNSUPPORTED with intent', () => {
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const navDetails = createRampUnsupportedModalNavigationDetails();

        navigate(intent, undefined, {
          ...v1Deps,
          rampRoutingDecision: UnifiedRampRoutingType.UNSUPPORTED,
        });

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

        navigate(undefined, undefined, v1Deps);

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

        navigate(intent, undefined, v1Deps);

        expect(mockCreateTokenSelectionNavigationDetails).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });
    });

    describe('smart routing based on routing decision', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };

      it('navigates to TokenSelection when routing decision is null', () => {
        const mockNavDetails = [
          Routes.RAMP.TOKEN_SELECTION,
          undefined,
        ] as const;
        mockCreateTokenSelectionNavigationDetails.mockReturnValue(
          mockNavDetails,
        );

        navigate(intent, undefined, { ...v1Deps, rampRoutingDecision: null });

        expect(mockCreateTokenSelectionNavigationDetails).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
        expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
      });

      it('navigates to deposit when routing decision is DEPOSIT', () => {
        const mockNavDetails = [Routes.DEPOSIT.ID] as const;
        mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

        navigate(intent, undefined, {
          ...v1Deps,
          rampRoutingDecision: UnifiedRampRoutingType.DEPOSIT,
        });

        expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(intent);
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateRampNavigationDetails).not.toHaveBeenCalled();
      });

      it('navigates to aggregator when routing decision is AGGREGATOR', () => {
        const mockNavDetails = [Routes.RAMP.BUY] as const;
        mockCreateRampNavigationDetails.mockReturnValue(mockNavDetails);

        navigate(intent, undefined, {
          ...v1Deps,
          rampRoutingDecision: UnifiedRampRoutingType.AGGREGATOR,
        });

        expect(mockCreateRampNavigationDetails).toHaveBeenCalledWith(
          AggregatorRampType.BUY,
          intent,
        );
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateDepositNavigationDetails).not.toHaveBeenCalled();
      });
    });
  });

  describe('override mode', () => {
    it('navigates to deposit when mode is DEPOSIT and override unified routing', () => {
      const mockNavDetails = [Routes.DEPOSIT.ID] as const;
      mockCreateDepositNavigationDetails.mockReturnValue(mockNavDetails);

      navigate(
        undefined,
        {
          mode: NavigateToRampBuyMode.DEPOSIT,
          overrideUnifiedRouting: true,
        },
        {
          isRampsUnifiedV1Enabled: true,
          isRampsUnifiedV2Enabled: false,
          rampRoutingDecision: UnifiedRampRoutingType.AGGREGATOR,
        },
      );

      expect(mockCreateDepositNavigationDetails).toHaveBeenCalledWith(
        undefined,
      );
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });
  });
});
