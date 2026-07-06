import { RampType } from '../Aggregator/types';
import Routes from '../../../../constants/navigation/Routes';
import handleRampUrl from './handleRampUrl';
import handleRedirection from './handleRedirection';
import NavigationService from '../../../../core/NavigationService';
import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import type { Country, UserRegion } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import ReduxService from '../../../../core/redux';

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

const mockSelectGeolocationLocation = jest.fn<string | undefined, [unknown]>(
  () => 'us-ca',
);
jest.mock('../../../../selectors/geolocationController', () => ({
  selectGeolocationLocation: (state: unknown) =>
    mockSelectGeolocationLocation(state),
}));

const mockSelectUserRegion = jest.fn<UserRegion | null, [unknown]>(() => null);
const mockSelectCountries = jest.fn<{ data: Country[] }, [unknown]>(() => ({
  data: [],
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

const mockCreateRampsServiceDisruptionModalNavigationDetails = jest.fn(() => [
  'RAMPS_SERVICE_DISRUPTION_MODAL_ROUTE',
]);
jest.mock(
  '../components/RampsServiceDisruptionModal/RampsServiceDisruptionModal',
  () => ({
    createRampsServiceDisruptionModalNavigationDetails: () =>
      mockCreateRampsServiceDisruptionModalNavigationDetails(),
  }),
);

const mockSelectRampsServiceDisruptionRegions = jest.fn<string[], [unknown]>(
  () => [],
);
jest.mock(
  '../../../../selectors/featureFlagController/rampsServiceDisruption',
  () => ({
    selectRampsServiceDisruptionRegions: (state: unknown) =>
      mockSelectRampsServiceDisruptionRegions(state),
  }),
);

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
  selectUserRegion: (state: unknown) => mockSelectUserRegion(state),
  selectCountries: (state: unknown) => mockSelectCountries(state),
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
      GeolocationController: {
        refreshGeolocation: jest.fn(),
      },
    },
  },
}));

const mockRefreshGeolocation = Engine.context.GeolocationController
  .refreshGeolocation as jest.Mock;

describe('handleRampUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NavigationService.navigation.navigate as jest.Mock).mockClear();
    (handleRedirection as jest.Mock).mockClear();
    mockSelectGeolocationLocation.mockReturnValue('us-ca');
    mockSelectUserRegion.mockReturnValue(null);
    mockSelectCountries.mockReturnValue({ data: [] });
    mockSelectRampsServiceDisruptionRegions.mockReturnValue([]);
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

  describe('BUY unified flow', () => {
    it('navigates to eligibility failed modal when geolocation stays unknown after refresh', async () => {
      mockSelectGeolocationLocation.mockReturnValue(UNKNOWN_LOCATION);
      mockRefreshGeolocation.mockResolvedValue(UNKNOWN_LOCATION);
      await handleRampUrl({
        rampPath: '?as=example',
        rampType: RampType.BUY,
      });
      expect(mockRefreshGeolocation).toHaveBeenCalledTimes(1);
      expect(handleRedirection).not.toHaveBeenCalled();
      expect(
        mockCreateEligibilityFailedModalNavigationDetails,
      ).toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        'ELIGIBILITY_FAILED_MODAL_ROUTE',
      );
    });

    it('continues to TokenSelection when geolocation refresh resolves a known region', async () => {
      mockSelectGeolocationLocation.mockReturnValue(UNKNOWN_LOCATION);
      mockRefreshGeolocation.mockResolvedValue('us-ca');
      await handleRampUrl({
        rampPath: '?as=example',
        rampType: RampType.BUY,
      });
      expect(mockRefreshGeolocation).toHaveBeenCalledTimes(1);
      expect(
        jest.mocked(ReduxService.store.getState).mock.calls.length,
      ).toBeGreaterThanOrEqual(2);
      expect(mockCreateTokenSelectionNavDetails).toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        'TOKEN_SELECTION_ROUTE',
      );
    });

    it('does not refresh geolocation when a known location is already in state', async () => {
      mockSelectGeolocationLocation.mockReturnValue('us-ca');
      await handleRampUrl({
        rampPath: '?as=example',
        rampType: RampType.BUY,
      });
      expect(mockRefreshGeolocation).not.toHaveBeenCalled();
      expect(mockCreateTokenSelectionNavDetails).toHaveBeenCalled();
    });

    it('navigates to the service disruption modal when the resolved region is in an active service disruption', async () => {
      mockSelectRampsServiceDisruptionRegions.mockReturnValue(['us-ca']);
      mockSelectUserRegion.mockReturnValue({
        regionCode: 'us-ca',
        country: { isoCode: 'US' },
        state: null,
      } as unknown as UserRegion);
      await handleRampUrl({
        rampPath: '?as=example',
        rampType: RampType.BUY,
      });
      expect(handleRedirection).not.toHaveBeenCalled();
      expect(
        mockCreateRampsServiceDisruptionModalNavigationDetails,
      ).toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        'RAMPS_SERVICE_DISRUPTION_MODAL_ROUTE',
      );
      expect(mockCreateTokenSelectionNavDetails).not.toHaveBeenCalled();
    });

    it('shows the service disruption modal over the eligibility modal when geolocation is unknown but the region is in service disruption', async () => {
      mockSelectGeolocationLocation.mockReturnValue(UNKNOWN_LOCATION);
      mockRefreshGeolocation.mockResolvedValue(UNKNOWN_LOCATION);
      mockSelectRampsServiceDisruptionRegions.mockReturnValue(['in']);
      mockSelectUserRegion.mockReturnValue({
        regionCode: 'in',
        country: { isoCode: 'IN' },
        state: null,
      } as unknown as UserRegion);
      await handleRampUrl({
        rampPath: '?as=example',
        rampType: RampType.BUY,
      });
      expect(
        mockCreateRampsServiceDisruptionModalNavigationDetails,
      ).toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        'RAMPS_SERVICE_DISRUPTION_MODAL_ROUTE',
      );
      expect(
        mockCreateEligibilityFailedModalNavigationDetails,
      ).not.toHaveBeenCalled();
    });

    it('navigates to unsupported modal when the resolved region is definitively unsupported', async () => {
      mockSelectUserRegion.mockReturnValue({
        regionCode: 'cu',
        country: { isoCode: 'CU', supported: { buy: false, sell: false } },
        state: null,
      } as unknown as UserRegion);
      await handleRampUrl({
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

    it('navigates to TokenSelection when no assetId in intent', async () => {
      await handleRampUrl({
        rampPath: '?as=example',
        rampType: RampType.BUY,
      });
      expect(handleRedirection).not.toHaveBeenCalled();
      expect(mockCreateTokenSelectionNavDetails).toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        'TOKEN_SELECTION_ROUTE',
      );
    });

    it('navigates to BuildQuote when ramp intent has assetId', async () => {
      mockResolveRampControllerAssetId.mockReturnValue(
        'eip155:1/erc20:0x123456',
      );
      mockSelectTokens.mockReturnValue({
        data: { allTokens: [{ assetId: 'eip155:1/erc20:0x123456' }] },
      });
      await handleRampUrl({
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
