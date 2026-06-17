import { RampType } from '../Aggregator/types';
import Routes from '../../../../constants/navigation/Routes';
import handleRampUrl from './handleRampUrl';
import handleRedirection from './handleRedirection';
import NavigationService from '../../../../core/NavigationService';
import { UnifiedRampRoutingType } from '../../../../reducers/fiatOrders';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('@react-navigation/native');
jest.mock('./handleRedirection');

jest.mock('../../../../core/redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(() => ({})),
    },
  },
}));

const mockIsRampsUnifiedV2Enabled = jest.fn();
jest.mock('../utils/isRampsUnifiedV2Enabled', () => ({
  isRampsUnifiedV2Enabled: (state: unknown) =>
    mockIsRampsUnifiedV2Enabled(state),
}));

const mockGetRampRoutingDecision = jest.fn();
jest.mock('../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../reducers/fiatOrders'),
  getRampRoutingDecision: (state: unknown) => mockGetRampRoutingDecision(state),
}));

const mockCreateEligibilityFailedModalNavigationDetails = jest.fn(() => [
  'ELIGIBILITY_FAILED_MODAL_ROUTE',
]);
jest.mock(
  '../components/EligibilityFailedModal/EligibilityFailedModal',
  () => ({
    createEligibilityFailedModalNavigationDetails: () =>
      mockCreateEligibilityFailedModalNavigationDetails(),
  }),
);

const mockCreateRampUnsupportedModalNavigationDetails = jest.fn(() => [
  'UNSUPPORTED_MODAL_ROUTE',
]);
jest.mock('../components/RampUnsupportedModal/RampUnsupportedModal', () => ({
  createRampUnsupportedModalNavigationDetails: () =>
    mockCreateRampUnsupportedModalNavigationDetails(),
}));

const mockCreateBuildQuoteNavDetails = jest.fn(
  (params: { assetId: string }) => ['BUILD_QUOTE_ROUTE', params],
);
jest.mock('../Views/BuildQuote', () => ({
  createBuildQuoteNavDetails: (params: { assetId: string }) =>
    mockCreateBuildQuoteNavDetails(params),
}));

const mockCreateTokenSelectionNavDetails = jest.fn(() => [
  'TOKEN_SELECTION_ROUTE',
]);
jest.mock('../Views/TokenSelection/TokenSelection', () => ({
  createTokenSelectionNavDetails: () => mockCreateTokenSelectionNavDetails(),
}));

interface SelectTokensReturn {
  data: { allTokens: { assetId?: string; chainId?: string }[] };
}
const mockSelectTokens = jest.fn(
  (_state: unknown): SelectTokensReturn => ({
    data: { allTokens: [] },
  }),
);
jest.mock('../../../../selectors/rampsController', () => ({
  selectTokens: (state: unknown) => mockSelectTokens(state),
}));

const mockResolveRampControllerAssetId = jest.fn(
  (assetId: string, _allTokens: unknown[]) => assetId,
);
jest.mock('../utils/resolveRampControllerAssetId', () => ({
  resolveRampControllerAssetId: (assetId: string, allTokens: unknown[]) =>
    mockResolveRampControllerAssetId(assetId, allTokens),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      RampsController: {
        setSelectedToken: jest.fn(),
      },
    },
  },
}));

describe('handleRampUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NavigationService.navigation.navigate as jest.Mock).mockClear();
    (handleRedirection as jest.Mock).mockClear();
    mockIsRampsUnifiedV2Enabled.mockReturnValue(false);
  });

  it('handles redirection with the paths', () => {
    handleRampUrl({
      rampPath: '/somePath?as=example',
      rampType: RampType.BUY,
    });
    expect(handleRedirection).toHaveBeenCalledWith(
      ['somePath'],
      { as: 'example' },
      RampType.BUY,
    );
  });

  it('navigates to Buy route when rampType is BUY, redirectPaths length is 0 and query params do not have allowed fields', () => {
    handleRampUrl({
      rampPath: '?as=example',
      rampType: RampType.BUY,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.BUY,
    );
  });

  it('navigates to Sell route when rampType is SELL, redirectPaths length is 0 and query param do not have allowed fields', () => {
    handleRampUrl({
      rampPath: '?as=example',
      rampType: RampType.SELL,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.SELL,
    );
  });

  it('navigates to Buy route when rampType is BUY, redirectPaths length is 0 and query param is intent', () => {
    handleRampUrl({
      rampPath: '?chainId=1&address=0x123456',
      rampType: RampType.BUY,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.BUY,
      {
        screen: Routes.RAMP.ID,
        params: {
          screen: Routes.RAMP.BUILD_QUOTE,
          params: {
            assetId: 'eip155:1/erc20:0x123456',
          },
        },
      },
    );
  });

  it('navigates to Sell route when rampType is SELL, redirectPaths length is 0 and query param is intent', () => {
    handleRampUrl({
      rampPath: '?chainId=1&address=0x123456',
      rampType: RampType.SELL,
    });
    expect(handleRedirection).not.toHaveBeenCalled();
    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.RAMP.SELL,
      {
        screen: Routes.RAMP.ID,
        params: {
          screen: Routes.RAMP.BUILD_QUOTE,
          params: {
            assetId: 'eip155:1/erc20:0x123456',
          },
        },
      },
    );
  });

  describe('when Ramps Unified V2 is enabled', () => {
    beforeEach(() => {
      mockIsRampsUnifiedV2Enabled.mockReturnValue(true);
    });

    it('navigates to eligibility failed modal when routing decision is ERROR', () => {
      mockGetRampRoutingDecision.mockReturnValue(UnifiedRampRoutingType.ERROR);
      handleRampUrl({
        rampPath: '?as=example',
        rampType: RampType.BUY,
      });
      expect(handleRedirection).not.toHaveBeenCalled();
      expect(
        mockCreateEligibilityFailedModalNavigationDetails,
      ).toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        'ELIGIBILITY_FAILED_MODAL_ROUTE',
      );
    });

    it('navigates to unsupported modal when routing decision is UNSUPPORTED', () => {
      mockGetRampRoutingDecision.mockReturnValue(
        UnifiedRampRoutingType.UNSUPPORTED,
      );
      handleRampUrl({
        rampPath: '?as=example',
        rampType: RampType.BUY,
      });
      expect(handleRedirection).not.toHaveBeenCalled();
      expect(
        mockCreateRampUnsupportedModalNavigationDetails,
      ).toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        'UNSUPPORTED_MODAL_ROUTE',
      );
    });

    it('navigates to TokenSelection when V2 enabled and no assetId in intent', () => {
      mockGetRampRoutingDecision.mockReturnValue(null);
      handleRampUrl({
        rampPath: '?as=example',
        rampType: RampType.BUY,
      });
      expect(handleRedirection).not.toHaveBeenCalled();
      expect(mockCreateTokenSelectionNavDetails).toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        'TOKEN_SELECTION_ROUTE',
      );
    });

    it('navigates to BuildQuote when V2 enabled and ramp intent has assetId', () => {
      mockGetRampRoutingDecision.mockReturnValue(null);
      mockResolveRampControllerAssetId.mockReturnValue(
        'eip155:1/erc20:0x123456',
      );
      mockSelectTokens.mockReturnValue({
        data: { allTokens: [{ assetId: 'eip155:1/erc20:0x123456' }] },
      });
      handleRampUrl({
        rampPath: '?chainId=1&address=0x123456',
        rampType: RampType.BUY,
      });
      expect(handleRedirection).not.toHaveBeenCalled();
      expect(mockResolveRampControllerAssetId).toHaveBeenCalledWith(
        'eip155:1/erc20:0x123456',
        expect.any(Array),
      );
      expect(
        Engine.context.RampsController.setSelectedToken,
      ).toHaveBeenCalledWith('eip155:1/erc20:0x123456');
      expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith(
        expect.objectContaining({ assetId: 'eip155:1/erc20:0x123456' }),
      );
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        'BUILD_QUOTE_ROUTE',
        { assetId: 'eip155:1/erc20:0x123456' },
      );
    });
  });
});
