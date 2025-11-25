import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  useAddressTrustSignals,
  useAddressTrustSignal,
} from './useAddressTrustSignals';
import { TrustSignalDisplayState } from '../types/trustSignals';

describe('useAddressTrustSignals', () => {
  const TEST_ADDRESS_1 = '0x1234567890123456789012345678901234567890';
  const TEST_ADDRESS_2 = '0xabcdef1234567890abcdef1234567890abcdef12';
  const TEST_CHAIN_ID = '0x1';

  describe('useAddressTrustSignals', () => {
    it('returns Malicious state for malicious address', () => {
      const requests = [{ address: TEST_ADDRESS_1, chainId: TEST_CHAIN_ID }];

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignals(requests),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {
                    [`${TEST_CHAIN_ID.toLowerCase()}:${TEST_ADDRESS_1.toLowerCase()}`]:
                      {
                        data: {
                          result_type: 'Malicious',
                          label: 'Known scammer',
                        },
                      },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual({
        state: TrustSignalDisplayState.Malicious,
        label: 'Known scammer',
      });
    });

    it('returns Warning state for warning address', () => {
      const requests = [{ address: TEST_ADDRESS_1, chainId: TEST_CHAIN_ID }];

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignals(requests),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {
                    [`${TEST_CHAIN_ID.toLowerCase()}:${TEST_ADDRESS_1.toLowerCase()}`]:
                      {
                        data: {
                          result_type: 'Warning',
                          label: 'Suspicious activity',
                        },
                      },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual({
        state: TrustSignalDisplayState.Warning,
        label: 'Suspicious activity',
      });
    });

    it('returns Loading state for loading address', () => {
      const requests = [{ address: TEST_ADDRESS_1, chainId: TEST_CHAIN_ID }];

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignals(requests),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {
                    [`${TEST_CHAIN_ID.toLowerCase()}:${TEST_ADDRESS_1.toLowerCase()}`]:
                      {
                        data: {
                          result_type: 'Loading',
                        },
                      },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual({
        state: TrustSignalDisplayState.Loading,
        label: null,
      });
    });

    it('returns Unknown state for benign address', () => {
      const requests = [{ address: TEST_ADDRESS_1, chainId: TEST_CHAIN_ID }];

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignals(requests),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {
                    [`${TEST_CHAIN_ID.toLowerCase()}:${TEST_ADDRESS_1.toLowerCase()}`]:
                      {
                        data: {
                          result_type: 'Benign',
                        },
                      },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual({
        state: TrustSignalDisplayState.Unknown,
        label: null,
      });
    });

    it('returns Unknown state when no scan result exists', () => {
      const requests = [{ address: TEST_ADDRESS_1, chainId: TEST_CHAIN_ID }];

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignals(requests),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {},
                },
              },
            },
          },
        },
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual({
        state: TrustSignalDisplayState.Unknown,
        label: null,
      });
    });

    it('returns empty array for empty requests', () => {
      const { result } = renderHookWithProvider(
        () => useAddressTrustSignals([]),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {},
                },
              },
            },
          },
        },
      );

      expect(result.current).toEqual([]);
    });

    it('returns results for multiple addresses', () => {
      const requests = [
        { address: TEST_ADDRESS_1, chainId: TEST_CHAIN_ID },
        { address: TEST_ADDRESS_2, chainId: TEST_CHAIN_ID },
      ];

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignals(requests),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {
                    [`${TEST_CHAIN_ID.toLowerCase()}:${TEST_ADDRESS_1.toLowerCase()}`]:
                      {
                        data: {
                          result_type: 'Malicious',
                          label: 'Scammer',
                        },
                      },
                    [`${TEST_CHAIN_ID.toLowerCase()}:${TEST_ADDRESS_2.toLowerCase()}`]:
                      {
                        data: {
                          result_type: 'Warning',
                          label: 'Suspicious',
                        },
                      },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toEqual({
        state: TrustSignalDisplayState.Malicious,
        label: 'Scammer',
      });
      expect(result.current[1]).toEqual({
        state: TrustSignalDisplayState.Warning,
        label: 'Suspicious',
      });
    });

    it('returns null label when scan result has no label', () => {
      const requests = [{ address: TEST_ADDRESS_1, chainId: TEST_CHAIN_ID }];

      const { result } = renderHookWithProvider(
        () => useAddressTrustSignals(requests),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {
                    [`${TEST_CHAIN_ID.toLowerCase()}:${TEST_ADDRESS_1.toLowerCase()}`]:
                      {
                        data: {
                          result_type: 'Malicious',
                        },
                      },
                  },
                },
              },
            },
          },
        },
      );

      expect(result.current[0].label).toBeNull();
    });
  });

  describe('useAddressTrustSignal', () => {
    it('returns trust signal for single address', () => {
      const { result } = renderHookWithProvider(
        () => useAddressTrustSignal(TEST_ADDRESS_1, TEST_CHAIN_ID),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {
                    [`${TEST_CHAIN_ID.toLowerCase()}:${TEST_ADDRESS_1.toLowerCase()}`]:
                      {
                        data: {
                          result_type: 'Malicious',
                          label: 'Known scammer',
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
        label: 'Known scammer',
      });
    });

    it('returns Unknown state when address is undefined', () => {
      const { result } = renderHookWithProvider(
        () => useAddressTrustSignal(undefined, TEST_CHAIN_ID),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {},
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

    it('returns Unknown state when chainId is undefined', () => {
      const { result } = renderHookWithProvider(
        () => useAddressTrustSignal(TEST_ADDRESS_1, undefined),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {},
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

    it('returns Unknown state when both address and chainId are undefined', () => {
      const { result } = renderHookWithProvider(
        () => useAddressTrustSignal(undefined, undefined),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {},
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

    it('returns Unknown state when no scan result exists for address', () => {
      const { result } = renderHookWithProvider(
        () => useAddressTrustSignal(TEST_ADDRESS_1, TEST_CHAIN_ID),
        {
          state: {
            engine: {
              backgroundState: {
                PhishingController: {
                  addressScanCache: {},
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
  });
});
