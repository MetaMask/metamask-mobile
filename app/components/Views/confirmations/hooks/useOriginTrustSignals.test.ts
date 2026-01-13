import { RecommendedAction } from '@metamask/phishing-controller';

import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useOriginTrustSignals } from './useOriginTrustSignals';
import { TrustSignalDisplayState } from '../types/trustSignals';

describe('useOriginTrustSignals', () => {
  it('returns Malicious state for Block recommended action', () => {
    const origin = 'https://malicious-site.com';

    const { result } = renderHookWithProvider(
      () => useOriginTrustSignals(origin),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                urlScanCache: {
                  'malicious-site.com': {
                    data: {
                      recommendedAction: RecommendedAction.Block,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Malicious,
      label: null,
    });
  });

  it('returns Warning state for Warn recommended action', () => {
    const origin = 'https://suspicious-site.com';

    const { result } = renderHookWithProvider(
      () => useOriginTrustSignals(origin),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                urlScanCache: {
                  'suspicious-site.com': {
                    data: {
                      recommendedAction: RecommendedAction.Warn,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Warning,
      label: null,
    });
  });

  it('returns Verified state for Verified recommended action', () => {
    const origin = 'https://verified-site.com';

    const { result } = renderHookWithProvider(
      () => useOriginTrustSignals(origin),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                urlScanCache: {
                  'verified-site.com': {
                    data: {
                      recommendedAction: RecommendedAction.Verified,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Verified,
      label: null,
    });
  });

  it('returns Unknown state for None recommended action', () => {
    const origin = 'https://neutral-site.com';

    const { result } = renderHookWithProvider(
      () => useOriginTrustSignals(origin),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                urlScanCache: {
                  'neutral-site.com': {
                    data: {
                      recommendedAction: RecommendedAction.None,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Unknown,
      label: null,
    });
  });

  it('returns Unknown state when no scan result exists', () => {
    const origin = 'https://unknown-site.com';

    const { result } = renderHookWithProvider(
      () => useOriginTrustSignals(origin),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                urlScanCache: {},
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Unknown,
      label: null,
    });
  });

  it('returns Unknown state when origin is undefined', () => {
    const { result } = renderHookWithProvider(
      () => useOriginTrustSignals(undefined),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                urlScanCache: {
                  'some-site.com': {
                    data: {
                      recommendedAction: RecommendedAction.Block,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Unknown,
      label: null,
    });
  });

  it('extracts hostname from full URL with path', () => {
    const origin = 'https://malicious-site.com/phishing/page';

    const { result } = renderHookWithProvider(
      () => useOriginTrustSignals(origin),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                urlScanCache: {
                  'malicious-site.com': {
                    data: {
                      recommendedAction: RecommendedAction.Block,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Malicious,
      label: null,
    });
  });

  it('extracts hostname from URL with port', () => {
    const origin = 'https://malicious-site.com:8080';

    const { result } = renderHookWithProvider(
      () => useOriginTrustSignals(origin),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                urlScanCache: {
                  'malicious-site.com': {
                    data: {
                      recommendedAction: RecommendedAction.Block,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Malicious,
      label: null,
    });
  });

  it('extracts hostname from URL with query parameters', () => {
    const origin = 'https://malicious-site.com?param=value';

    const { result } = renderHookWithProvider(
      () => useOriginTrustSignals(origin),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                urlScanCache: {
                  'malicious-site.com': {
                    data: {
                      recommendedAction: RecommendedAction.Block,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Malicious,
      label: null,
    });
  });

  it('handles subdomain in URL', () => {
    const origin = 'https://sub.malicious-site.com';

    const { result } = renderHookWithProvider(
      () => useOriginTrustSignals(origin),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                urlScanCache: {
                  'sub.malicious-site.com': {
                    data: {
                      recommendedAction: RecommendedAction.Block,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Malicious,
      label: null,
    });
  });

  it('returns Unknown state when recommendedAction is undefined', () => {
    const origin = 'https://partial-result-site.com';

    const { result } = renderHookWithProvider(
      () => useOriginTrustSignals(origin),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                urlScanCache: {
                  'partial-result-site.com': {
                    data: {},
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Unknown,
      label: null,
    });
  });

  it('handles plain hostname without protocol', () => {
    // extractHostname should handle this case by returning the input as-is
    const origin = 'plain-hostname.com';

    const { result } = renderHookWithProvider(
      () => useOriginTrustSignals(origin),
      {
        state: {
          engine: {
            backgroundState: {
              PhishingController: {
                urlScanCache: {
                  'plain-hostname.com': {
                    data: {
                      recommendedAction: RecommendedAction.Block,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual({
      state: TrustSignalDisplayState.Malicious,
      label: null,
    });
  });
});
