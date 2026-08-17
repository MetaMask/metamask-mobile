import { useQuery } from '@metamask/react-data-query';
import { RecommendedAction } from '@metamask/phishing-controller';

import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useOriginTrustSignals } from './useOriginTrustSignals';
import { TrustSignalDisplayState } from '../types/trustSignals';

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

const mockUseQuery = jest.mocked(useQuery);

function mockScanResult(recommendedAction: RecommendedAction | undefined) {
  mockUseQuery.mockReturnValue({
    data: recommendedAction
      ? { hostname: 'example.com', recommendedAction }
      : undefined,
  } as ReturnType<typeof useQuery>);
}

describe('useOriginTrustSignals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScanResult(undefined);
  });

  it.each([
    [RecommendedAction.Block, TrustSignalDisplayState.Malicious],
    [RecommendedAction.Warn, TrustSignalDisplayState.Warning],
    [RecommendedAction.Verified, TrustSignalDisplayState.Verified],
    [RecommendedAction.None, TrustSignalDisplayState.Unknown],
  ])(
    'returns %s recommended action as %s state',
    (recommendedAction, expectedState) => {
      mockScanResult(recommendedAction);

      const { result } = renderHookWithProvider(() =>
        useOriginTrustSignals('https://example.com'),
      );

      expect(result.current).toEqual({
        state: expectedState,
        label: null,
      });
    },
  );

  it('queries the scan result for the origin hostname', () => {
    renderHookWithProvider(() =>
      useOriginTrustSignals('https://example.com/some/path'),
    );

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['PhishingDataService:scanUrl', 'example.com'],
      enabled: true,
    });
  });

  it('returns Unknown state when there is no scan result', () => {
    const { result } = renderHookWithProvider(() =>
      useOriginTrustSignals('https://unknown-site.com'),
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Unknown,
      label: null,
    });
  });

  it('disables the query and returns Unknown state when origin is undefined', () => {
    const { result } = renderHookWithProvider(() =>
      useOriginTrustSignals(undefined),
    );

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['PhishingDataService:scanUrl', ''],
      enabled: false,
    });
    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Unknown,
      label: null,
    });
  });
});
