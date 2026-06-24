import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import type { Country, UserRegion } from '@metamask/ramps-controller';
import Routes from '../../../../constants/navigation/Routes';
import { useRampNavigation } from './useRampNavigation';
import { createSellNavigationDetails } from '../Aggregator/routes/utils';
import { createTokenSelectionNavDetails } from '../Views/TokenSelection/TokenSelection';
import { createBuildQuoteNavDetails } from '../Views/BuildQuote';
import { createEligibilityFailedModalNavigationDetails } from '../components/EligibilityFailedModal/EligibilityFailedModal';
import { createRampUnsupportedModalNavigationDetails } from '../components/RampUnsupportedModal/RampUnsupportedModal';
import { createRampsServiceDisruptionModalNavigationDetails } from '../components/RampsServiceDisruptionModal/RampsServiceDisruptionModal';

const mockSetSelectedToken = jest.fn();
const mockProvider = {
  id: 'provider-1',
  name: 'Provider 1',
};
let mockTokens: { allTokens: unknown[]; topTokens: unknown[] } | undefined;
let mockTokensLoading = false;
let mockTokensError: string | null = null;
let mockProviders: unknown[] = [mockProvider];
let mockProvidersLoading = false;
let mockProvidersError: string | null = null;
let mockLastProviders = mockProviders;
let mockLastProvidersLoading = mockProvidersLoading;
let mockLastProvidersError: string | null = mockProvidersError;
let mockProvidersSelectorResult: {
  data: unknown[];
  isLoading: boolean;
  error: string | null;
} = {
  data: mockProviders,
  isLoading: mockProvidersLoading,
  error: mockProvidersError,
};
let mockUserRegion: UserRegion | null;
let mockCountries: Country[];

jest.mock('./useRampsTokens', () => ({
  useRampsTokens: () => ({
    setSelectedToken: mockSetSelectedToken,
    tokens: mockTokens,
    isLoading: mockTokensLoading,
    error: mockTokensError,
  }),
}));
jest.mock('../../../../selectors/rampsController', () => ({
  selectProviders: () => {
    if (
      mockLastProviders !== mockProviders ||
      mockLastProvidersLoading !== mockProvidersLoading ||
      mockLastProvidersError !== mockProvidersError
    ) {
      mockLastProviders = mockProviders;
      mockLastProvidersLoading = mockProvidersLoading;
      mockLastProvidersError = mockProvidersError;
      mockProvidersSelectorResult = {
        data: mockProviders,
        isLoading: mockProvidersLoading,
        error: mockProvidersError,
      };
    }

    return mockProvidersSelectorResult;
  },
}));
jest.mock('./useRampsUserRegion', () => ({
  __esModule: true,
  useRampsUserRegion: () => ({
    userRegion: mockUserRegion,
    setUserRegion: jest.fn(),
  }),
  default: () => ({ userRegion: mockUserRegion, setUserRegion: jest.fn() }),
}));
jest.mock('./useRampsCountries', () => ({
  __esModule: true,
  useRampsCountries: () => ({
    countries: mockCountries,
    isLoading: false,
    error: null,
  }),
  default: () => ({ countries: mockCountries, isLoading: false, error: null }),
}));
jest.mock('@react-navigation/native');
jest.mock('../Aggregator/routes/utils');
jest.mock('../Views/TokenSelection/TokenSelection', () => {
  const actual = jest.requireActual('../Views/TokenSelection/TokenSelection');
  const mockFn = jest.fn();
  return {
    ...actual,
    createTokenSelectionNavDetails: mockFn,
    createTokenSelectionNavigationDetails: mockFn, // Alias for hook compatibility
  };
});
jest.mock('../Views/BuildQuote', () => {
  const mockFn = jest.fn();
  return {
    createBuildQuoteNavDetails: mockFn,
  };
});
const mockRefreshGeolocation = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    GeolocationController: {
      refreshGeolocation: (...args: unknown[]) =>
        mockRefreshGeolocation(...args),
    },
  },
}));

const mockNavigate = jest.fn();
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockCreateSellNavigationDetails =
  createSellNavigationDetails as jest.MockedFunction<
    typeof createSellNavigationDetails
  >;
const mockCreateTokenSelectionNavigationDetails =
  createTokenSelectionNavDetails as jest.MockedFunction<
    typeof createTokenSelectionNavDetails
  >;
const mockCreateBuildQuoteNavDetails =
  createBuildQuoteNavDetails as jest.MockedFunction<
    typeof createBuildQuoteNavDetails
  >;

const supportedUserRegion = {
  regionCode: 'us-ca',
  country: { isoCode: 'US', supported: { buy: true, sell: true } },
  state: null,
} as unknown as UserRegion;

// renders the hook with a known geolocation in state by default so the
// eligibility gate passes; callers can override geolocation per test.
const renderUseRampNavigation = (stateOverride: object = {}) =>
  renderHookWithProvider(() => useRampNavigation(), {
    state: merge(
      {
        engine: {
          backgroundState: {
            GeolocationController: { location: 'us-ca' },
          },
        },
      },
      stateOverride,
    ),
  });

describe('useRampNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetSelectedToken.mockClear();
    mockTokens = undefined;
    mockTokensLoading = false;
    mockTokensError = null;
    mockProviders = [mockProvider];
    mockProvidersLoading = false;
    mockProvidersError = null;
    mockLastProviders = mockProviders;
    mockLastProvidersLoading = mockProvidersLoading;
    mockLastProvidersError = mockProvidersError;
    mockProvidersSelectorResult = {
      data: mockProviders,
      isLoading: mockProvidersLoading,
      error: mockProvidersError,
    };
    // Default region/countries are indeterminate (not loaded) → never blocks.
    mockUserRegion = null;
    mockCountries = [];

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);

    mockRefreshGeolocation.mockResolvedValue('UNKNOWN');

    mockCreateSellNavigationDetails.mockReturnValue([
      Routes.RAMP.SELL,
    ] as unknown as ReturnType<typeof createSellNavigationDetails>);

    mockCreateTokenSelectionNavigationDetails.mockReturnValue([
      Routes.RAMP.TOKEN_SELECTION,
    ] as unknown as ReturnType<typeof createTokenSelectionNavDetails>);

    mockCreateBuildQuoteNavDetails.mockReturnValue([
      Routes.RAMP.TOKEN_SELECTION,
      {
        screen: Routes.RAMP.TOKEN_SELECTION_ROOT,
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
          screen: Routes.RAMP.TOKEN_SELECTION_ROOT,
          params: {
            screen: Routes.RAMP.AMOUNT_INPUT,
            params: { assetId: intent.assetId },
          },
        },
      ] as const;
      mockCreateBuildQuoteNavDetails.mockReturnValue(mockNavDetails);

      const { result } = renderUseRampNavigation();

      result.current.goToBuy(intent);

      expect(mockSetSelectedToken).toHaveBeenCalledWith(intent.assetId);
      expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
        assetId: intent.assetId,
        buyFlowOrigin: undefined,
      });
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateSellNavigationDetails).not.toHaveBeenCalled();
    });

    it('passes buyFlowOrigin through to BuildQuote params', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };

      const { result } = renderUseRampNavigation();

      result.current.goToBuy(intent, { buyFlowOrigin: 'tokenInfo' });

      expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
        assetId: intent.assetId,
        buyFlowOrigin: 'tokenInfo',
      });
    });

    it('passes homeTokenList buyFlowOrigin through to BuildQuote params', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };

      const { result } = renderUseRampNavigation();

      result.current.goToBuy(intent, { buyFlowOrigin: 'homeTokenList' });

      expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
        assetId: intent.assetId,
        buyFlowOrigin: 'homeTokenList',
      });
    });

    it('navigates to TokenSelection when no assetId is provided', () => {
      const mockNavDetails = [Routes.RAMP.TOKEN_SELECTION, undefined] as const;
      mockCreateTokenSelectionNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderUseRampNavigation();

      result.current.goToBuy();

      expect(mockSetSelectedToken).not.toHaveBeenCalled();
      expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      expect(mockCreateTokenSelectionNavigationDetails).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      expect(mockCreateSellNavigationDetails).not.toHaveBeenCalled();
    });

    describe('unsupported token routing', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };

      it('navigates to RampUnsupportedModal when tokens loaded and the resolved assetId is not in allTokens', () => {
        mockTokens = {
          allTokens: [
            {
              assetId: 'eip155:1/erc20:0xaaa',
              chainId: 'eip155:1',
              tokenSupported: true,
            },
          ],
          topTokens: [],
        };
        const navDetails = createRampUnsupportedModalNavigationDetails();

        const { result } = renderUseRampNavigation();

        result.current.goToBuy(intent);

        expect(mockSetSelectedToken).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      });

      it('navigates to RampUnsupportedModal when the matched token has tokenSupported=false', () => {
        mockTokens = {
          allTokens: [
            {
              assetId: 'eip155:1/erc20:0x123',
              chainId: 'eip155:1',
              tokenSupported: false,
            },
          ],
          topTokens: [],
        };
        const navDetails = createRampUnsupportedModalNavigationDetails();

        const { result } = renderUseRampNavigation();

        result.current.goToBuy(intent);

        expect(mockSetSelectedToken).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      });

      it('navigates to BuildQuote when the matched token has tokenSupported=true', () => {
        mockTokens = {
          allTokens: [
            {
              assetId: 'eip155:1/erc20:0x123',
              chainId: 'eip155:1',
              tokenSupported: true,
            },
          ],
          topTokens: [],
        };
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

        const { result } = renderUseRampNavigation();

        result.current.goToBuy(intent);

        expect(mockSetSelectedToken).toHaveBeenCalledWith(intent.assetId);
        expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalledWith({
          assetId: intent.assetId,
          buyFlowOrigin: undefined,
        });
        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
      });
    });

    describe('empty V2 catalog routing', () => {
      it('navigates to RampUnsupportedModal when the loaded catalog has no providers', () => {
        mockProviders = [];
        mockTokens = {
          allTokens: [
            {
              assetId: 'eip155:1/erc20:0x123',
              chainId: 'eip155:1',
              tokenSupported: true,
            },
          ],
          topTokens: [],
        };
        const navDetails = createRampUnsupportedModalNavigationDetails();

        const { result } = renderUseRampNavigation();

        result.current.goToBuy();

        expect(mockSetSelectedToken).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
        expect(
          mockCreateTokenSelectionNavigationDetails,
        ).not.toHaveBeenCalled();
        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      });

      it('navigates to RampUnsupportedModal when the loaded catalog has no buyable tokens', () => {
        mockTokens = {
          allTokens: [
            {
              assetId: 'eip155:1/erc20:0x123',
              chainId: 'eip155:1',
              tokenSupported: false,
            },
          ],
          topTokens: [],
        };
        const navDetails = createRampUnsupportedModalNavigationDetails();

        const { result } = renderUseRampNavigation();

        result.current.goToBuy();

        expect(mockSetSelectedToken).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
        expect(
          mockCreateTokenSelectionNavigationDetails,
        ).not.toHaveBeenCalled();
        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      });

      it('waits for the catalog before treating an empty provider list as unsupported', () => {
        mockProviders = [];
        mockProvidersLoading = true;
        mockTokens = {
          allTokens: [
            {
              assetId: 'eip155:1/erc20:0x123',
              chainId: 'eip155:1',
              tokenSupported: true,
            },
          ],
          topTokens: [],
        };
        const mockNavDetails = [
          Routes.RAMP.TOKEN_SELECTION,
          undefined,
        ] as const;
        mockCreateTokenSelectionNavigationDetails.mockReturnValue(
          mockNavDetails,
        );

        const { result } = renderUseRampNavigation();

        result.current.goToBuy();

        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      });

      it('does not treat an empty provider list as unsupported when providers failed to load', () => {
        mockProviders = [];
        mockProvidersError = 'Network error';
        mockTokens = {
          allTokens: [
            {
              assetId: 'eip155:1/erc20:0x123',
              chainId: 'eip155:1',
              tokenSupported: true,
            },
          ],
          topTokens: [],
        };
        const mockNavDetails = [
          Routes.RAMP.TOKEN_SELECTION,
          undefined,
        ] as const;
        mockCreateTokenSelectionNavigationDetails.mockReturnValue(
          mockNavDetails,
        );

        const { result } = renderUseRampNavigation();

        result.current.goToBuy();

        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      });

      it('does not treat an empty provider list as unsupported before tokens have loaded', () => {
        mockProviders = [];
        mockTokens = undefined;
        const mockNavDetails = [
          Routes.RAMP.TOKEN_SELECTION,
          undefined,
        ] as const;
        mockCreateTokenSelectionNavigationDetails.mockReturnValue(
          mockNavDetails,
        );

        const { result } = renderUseRampNavigation();

        result.current.goToBuy();

        expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      });
    });

    describe('service disruption routing', () => {
      it('navigates to RampsServiceDisruptionModal when a service disruption covers the user region', async () => {
        mockUserRegion = supportedUserRegion; // regionCode 'us-ca'
        const { result } = renderUseRampNavigation({
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: { rampsServiceDisruptionModal: ['us-ca'] },
              },
            },
          },
        });

        await result.current.goToBuy();

        expect(mockNavigate).toHaveBeenCalledWith(
          ...createRampsServiceDisruptionModalNavigationDetails(),
        );
      });

      it('does not block when the service disruption list does not cover the region', async () => {
        mockUserRegion = supportedUserRegion; // 'us-ca'
        const { result } = renderUseRampNavigation({
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: { rampsServiceDisruptionModal: ['fr'] },
              },
            },
          },
        });

        await result.current.goToBuy();

        expect(mockNavigate).not.toHaveBeenCalledWith(
          ...createRampsServiceDisruptionModalNavigationDetails(),
        );
        // falls through to TokenSelection (no assetId intent)
        expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.TOKEN_SELECTION);
      });

      it('shows the service disruption modal over the eligibility modal when geolocation is unknown but the region is in service disruption', async () => {
        mockUserRegion = {
          regionCode: 'in',
          country: { isoCode: 'IN', supported: { buy: true, sell: true } },
          state: null,
        } as unknown as UserRegion;
        mockRefreshGeolocation.mockResolvedValue('UNKNOWN');
        const { result } = renderUseRampNavigation({
          engine: {
            backgroundState: {
              GeolocationController: { location: 'UNKNOWN' },
              RemoteFeatureFlagController: {
                remoteFeatureFlags: { rampsServiceDisruptionModal: ['in'] },
              },
            },
          },
        });

        await result.current.goToBuy();

        expect(mockNavigate).toHaveBeenCalledWith(
          ...createRampsServiceDisruptionModalNavigationDetails(),
        );
        expect(mockNavigate).not.toHaveBeenCalledWith(
          ...createEligibilityFailedModalNavigationDetails(),
        );
      });
    });

    describe('eligibility gate (geolocation + RampsController region)', () => {
      it('refreshes geolocation and shows the eligibility failed modal when geolocation stays UNKNOWN', async () => {
        mockRefreshGeolocation.mockResolvedValue('UNKNOWN');
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const navDetails = createEligibilityFailedModalNavigationDetails();

        const { result } = renderUseRampNavigation({
          engine: {
            backgroundState: {
              GeolocationController: { location: 'UNKNOWN' },
            },
          },
        });

        await result.current.goToBuy(intent);

        expect(mockRefreshGeolocation).toHaveBeenCalledTimes(1);
        expect(mockSetSelectedToken).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      });

      it('refreshes geolocation and routes into the flow when geolocation recovers', async () => {
        mockRefreshGeolocation.mockResolvedValue('us-ca');
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const eligibilityNavDetails =
          createEligibilityFailedModalNavigationDetails();

        const { result } = renderUseRampNavigation({
          engine: {
            backgroundState: {
              GeolocationController: { location: 'UNKNOWN' },
            },
          },
        });

        await result.current.goToBuy(intent);

        expect(mockRefreshGeolocation).toHaveBeenCalledTimes(1);
        expect(mockSetSelectedToken).toHaveBeenCalledWith(intent.assetId);
        expect(mockCreateBuildQuoteNavDetails).toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalledWith(...eligibilityNavDetails);
      });

      it('routes into the flow from the geolocation already in state without refreshing', async () => {
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const eligibilityNavDetails =
          createEligibilityFailedModalNavigationDetails();

        const { result } = renderUseRampNavigation({
          engine: {
            backgroundState: {
              GeolocationController: { location: 'us-ca' },
            },
          },
        });

        await result.current.goToBuy(intent);

        expect(mockRefreshGeolocation).not.toHaveBeenCalled();
        expect(mockSetSelectedToken).toHaveBeenCalledWith(intent.assetId);
        expect(mockNavigate).not.toHaveBeenCalledWith(...eligibilityNavDetails);
      });

      it('navigates to unsupported modal when the resolved region is definitively unsupported for buy', async () => {
        mockUserRegion = {
          regionCode: 'cu',
          country: { isoCode: 'CU', supported: { buy: false, sell: false } },
          state: null,
        } as unknown as UserRegion;
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const navDetails = createRampUnsupportedModalNavigationDetails();

        const { result } = renderUseRampNavigation();

        await result.current.goToBuy(intent);

        expect(mockRefreshGeolocation).not.toHaveBeenCalled();
        expect(mockSetSelectedToken).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      });

      it('navigates to unsupported modal when the region is absent from the loaded supported countries', async () => {
        mockUserRegion = {
          regionCode: 'cu',
          country: { isoCode: 'CU' },
          state: null,
        } as unknown as UserRegion;
        mockCountries = [
          { isoCode: 'US', supported: { buy: true, sell: true } },
        ] as unknown as Country[];
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const navDetails = createRampUnsupportedModalNavigationDetails();

        const { result } = renderUseRampNavigation();

        await result.current.goToBuy(intent);

        expect(mockSetSelectedToken).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
        expect(mockCreateBuildQuoteNavDetails).not.toHaveBeenCalled();
      });

      it('proceeds into the flow when the resolved region is supported for buy', async () => {
        mockUserRegion = supportedUserRegion;
        const intent = { assetId: 'eip155:1/erc20:0x123' };
        const unsupportedNavDetails =
          createRampUnsupportedModalNavigationDetails();

        const { result } = renderUseRampNavigation();

        await result.current.goToBuy(intent);

        expect(mockSetSelectedToken).toHaveBeenCalledWith(intent.assetId);
        expect(mockNavigate).not.toHaveBeenCalledWith(...unsupportedNavDetails);
      });
    });
  });

  describe('goToSell', () => {
    it('navigates to aggregator SELL flow', () => {
      const mockNavDetails = [Routes.RAMP.SELL] as const;
      mockCreateSellNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderUseRampNavigation();

      result.current.goToSell();

      expect(mockCreateSellNavigationDetails).toHaveBeenCalledWith(undefined);
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });

    it('navigates to aggregator SELL with intent', () => {
      const intent = { assetId: 'eip155:1/erc20:0x123' };
      const mockNavDetails = [Routes.RAMP.SELL] as const;
      mockCreateSellNavigationDetails.mockReturnValue(mockNavDetails);

      const { result } = renderUseRampNavigation();
      result.current.goToSell(intent);

      expect(mockCreateSellNavigationDetails).toHaveBeenCalledWith(intent);
      expect(mockNavigate).toHaveBeenCalledWith(...mockNavDetails);
    });
  });
});
