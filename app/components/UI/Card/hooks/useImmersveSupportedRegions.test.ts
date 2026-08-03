import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useImmersveSupportedRegions from './useImmersveSupportedRegions';
import Engine from '../../../../core/Engine';
import type { CardApiImmersveSupportedRegionsResponse } from '../../../../core/Engine/controllers/card-controller/services/immersve-supported-regions.types';
import {
  selectImmersveOnboardingEnabled,
  selectCardFeatureFlag,
} from '../../../../selectors/featureFlagController/card';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockGetImmersveSupportedRegions = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      getImmersveSupportedRegions: jest.fn(),
    },
  },
}));

const mockRefetch = jest.fn();
let mockQueryFn: (() => Promise<unknown>) | undefined;
let lastUseQueryArgs: { enabled?: boolean; queryKey?: unknown } | undefined;
let mockQueryReturn: {
  data: unknown;
  isLoading: boolean;
  error: Error | null;
  refetch: jest.Mock;
} = {
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
};

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockImplementation((args) => {
    lastUseQueryArgs = args;
    mockQueryFn = args.queryFn;
    return mockQueryReturn;
  }),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const RESPONSE: CardApiImmersveSupportedRegionsResponse = {
  provider: 'immersve',
  regions: [
    {
      code: 'GB',
      name: 'United Kingdom',
      isAvailable: true,
      unstructuredAddressAllowed: false,
      documents: {
        generalTermsOfUse: {
          title: 'Terms',
          url: 'https://example.com/gb/terms',
        },
        privacyPolicy: {
          title: 'Privacy',
          url: 'https://example.com/gb/privacy',
        },
        disclosures: [],
        marketCompliance: [
          {
            title: 'Market',
            url: 'https://example.com/gb/market',
          },
        ],
      },
    },
    {
      code: 'AU',
      name: 'Australia',
      isAvailable: true,
      unstructuredAddressAllowed: false,
      documents: {
        generalTermsOfUse: {
          title: 'AU Terms',
          url: 'https://example.com/au/terms',
        },
        privacyPolicy: {
          title: 'AU Privacy',
          url: 'https://example.com/au/privacy',
        },
        disclosures: [],
        marketCompliance: [],
      },
    },
  ],
};

function mockImmersveSelectors({
  immersveEnabled = true,
  immersveCountries = ['GB', 'AU'],
}: {
  immersveEnabled?: boolean;
  immersveCountries?: string[];
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectImmersveOnboardingEnabled) {
      return immersveEnabled;
    }
    if (selector === selectCardFeatureFlag) {
      return { immersveCountries };
    }
    return undefined;
  });
}

describe('useImmersveSupportedRegions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastUseQueryArgs = undefined;
    mockQueryFn = undefined;
    mockQueryReturn = {
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
    mockRefetch.mockResolvedValue({ data: null });

    (
      Engine.context.CardController.getImmersveSupportedRegions as jest.Mock
    ).mockImplementation(mockGetImmersveSupportedRegions);
    mockGetImmersveSupportedRegions.mockResolvedValue(RESPONSE);
  });

  it('uses full-list query key without regionCode and 5m staleTime', () => {
    mockImmersveSelectors();

    renderHook(() => useImmersveSupportedRegions('GB'));

    expect(lastUseQueryArgs).toEqual(
      expect.objectContaining({
        queryKey: ['card', 'dashboard', 'immersveSupportedRegions'],
        staleTime: 5 * 60 * 1000,
        enabled: true,
      }),
    );
  });

  it('disables query for non-Immersve countries', () => {
    mockImmersveSelectors({ immersveCountries: ['GB'] });

    renderHook(() => useImmersveSupportedRegions('US'));

    expect(lastUseQueryArgs).toEqual(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('disables query when Immersve onboarding flag is off', () => {
    mockImmersveSelectors({ immersveEnabled: false });

    renderHook(() => useImmersveSupportedRegions('GB'));

    expect(lastUseQueryArgs).toEqual(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('honors explicit enabled override for Card Home', () => {
    mockImmersveSelectors({ immersveEnabled: false });

    renderHook(() => useImmersveSupportedRegions('GB', { enabled: true }));

    expect(lastUseQueryArgs).toEqual(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('calls CardController.getImmersveSupportedRegions from queryFn', async () => {
    mockImmersveSelectors();

    renderHook(() => useImmersveSupportedRegions('GB'));

    const result = await mockQueryFn?.();

    expect(result).toStrictEqual(RESPONSE);
    expect(mockGetImmersveSupportedRegions).toHaveBeenCalledTimes(1);
  });

  it('derives region docs from cached full list when regionCode changes', () => {
    mockImmersveSelectors();
    mockQueryReturn = {
      ...mockQueryReturn,
      data: RESPONSE,
    };

    const { result, rerender } = renderHook(
      ({ code }) => useImmersveSupportedRegions(code),
      { initialProps: { code: 'GB' } },
    );

    expect(result.current.region?.code).toBe('GB');
    expect(result.current.onboardingDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'generalTermsOfUse' }),
        expect.objectContaining({ id: 'privacyPolicy' }),
      ]),
    );
    expect(result.current.onboardingDocuments.map((d) => d.id)).not.toContain(
      'marketCompliance-0',
    );
    expect(result.current.permanentDocuments.map((d) => d.id)).toContain(
      'marketCompliance-0',
    );

    const keyBefore = lastUseQueryArgs?.queryKey;
    rerender({ code: 'AU' });

    expect(result.current.region?.code).toBe('AU');
    expect(result.current.onboardingDocuments[0]?.url).toBe(
      'https://example.com/au/terms',
    );
    expect(lastUseQueryArgs?.queryKey).toStrictEqual(keyBefore);
  });

  it('exposes refetch that calls react-query refetch', async () => {
    mockImmersveSelectors();
    mockRefetch.mockResolvedValue({ data: RESPONSE });

    const { result } = renderHook(() => useImmersveSupportedRegions('GB'));

    let fetchResult: unknown;
    await act(async () => {
      fetchResult = await result.current.refetch();
    });

    expect(mockRefetch).toHaveBeenCalled();
    expect(fetchResult).toStrictEqual(RESPONSE);
  });

  it('returns error from useQuery', () => {
    mockImmersveSelectors();
    mockQueryReturn = {
      ...mockQueryReturn,
      error: new Error('502 upstream'),
    };

    const { result } = renderHook(() => useImmersveSupportedRegions('GB'));

    expect(result.current.error).toEqual(new Error('502 upstream'));
  });

  it('keeps isLoading true while first fetch is paused (isLoading without isFetching)', () => {
    mockImmersveSelectors();
    mockQueryReturn = {
      ...mockQueryReturn,
      isLoading: true,
    };

    const { result } = renderHook(() => useImmersveSupportedRegions('GB'));

    expect(result.current.isLoading).toBe(true);
  });

  it('exposes isLoading false when query is disabled', () => {
    mockImmersveSelectors({ immersveEnabled: false });
    mockQueryReturn = {
      ...mockQueryReturn,
      isLoading: true,
    };

    const { result } = renderHook(() => useImmersveSupportedRegions('GB'));

    expect(result.current.isLoading).toBe(false);
  });
});
