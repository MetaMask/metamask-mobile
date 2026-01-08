import {
  selectImportSrpWordSuggestionEnabledRawFlag,
  selectImportSrpWordSuggestionEnabledFlag,
  IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME,
} from './index';

describe('importSrpWordSuggestion selectors', () => {
  describe('selectImportSrpWordSuggestionEnabledRawFlag', () => {
    it('returns default false when flag is not present in remote flags', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
            },
          },
        },
      };

      const result = selectImportSrpWordSuggestionEnabledRawFlag(
        state as never,
      );

      expect(result).toBe(false);
    });

    it('returns true when flag is set to true', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME]: true,
              },
            },
          },
        },
      };

      const result = selectImportSrpWordSuggestionEnabledRawFlag(
        state as never,
      );

      expect(result).toBe(true);
    });

    it('returns false when flag is set to false', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME]: false,
              },
            },
          },
        },
      };

      const result = selectImportSrpWordSuggestionEnabledRawFlag(
        state as never,
      );

      expect(result).toBe(false);
    });

    it('returns true when flag is a truthy value', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME]: 'enabled',
              },
            },
          },
        },
      };

      const result = selectImportSrpWordSuggestionEnabledRawFlag(
        state as never,
      );

      expect(result).toBe(true);
    });

    it('returns false when flag is null', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME]: null,
              },
            },
          },
        },
      };

      const result = selectImportSrpWordSuggestionEnabledRawFlag(
        state as never,
      );

      expect(result).toBe(false);
    });

    it('returns false when flag is undefined', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME]: undefined,
              },
            },
          },
        },
      };

      const result = selectImportSrpWordSuggestionEnabledRawFlag(
        state as never,
      );

      expect(result).toBe(false);
    });
  });

  describe('selectImportSrpWordSuggestionEnabledFlag', () => {
    it('returns false when basic functionality is disabled', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME]: true,
              },
            },
          },
        },
        settings: {
          basicFunctionalityEnabled: false,
        },
      };

      const result = selectImportSrpWordSuggestionEnabledFlag(state as never);

      expect(result).toBe(false);
    });

    it('returns flag value when basic functionality is enabled', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME]: true,
              },
            },
          },
        },
        settings: {
          basicFunctionalityEnabled: true,
        },
      };

      const result = selectImportSrpWordSuggestionEnabledFlag(state as never);

      expect(result).toBe(true);
    });

    it('returns false when basic functionality enabled but flag is false', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME]: false,
              },
            },
          },
        },
        settings: {
          basicFunctionalityEnabled: true,
        },
      };

      const result = selectImportSrpWordSuggestionEnabledFlag(state as never);

      expect(result).toBe(false);
    });

    it('returns false when basic functionality enabled and flag not present', () => {
      const state = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
            },
          },
        },
        settings: {
          basicFunctionalityEnabled: true,
        },
      };

      const result = selectImportSrpWordSuggestionEnabledFlag(state as never);

      expect(result).toBe(false);
    });
  });
});
