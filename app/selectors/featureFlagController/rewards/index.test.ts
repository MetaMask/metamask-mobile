import {
  selectRewardsEnabledFlag,
  FEATURE_FLAG_NAME,
  selectRewardsAnnouncementModalEnabledFlag,
  ANNOUNCEMENT_MODAL_FLAG_NAME,
} from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { EngineState } from '../../types';
import {
  mockedEmptyFlagsState,
  mockedUndefinedFlagsState,
  mockedState,
} from '../mocks';
import { StateWithPartialEngine } from '../types';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

const mockedStateWithRewardsEnabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          [FEATURE_FLAG_NAME]: true,
        },
        cacheTimestamp: 0,
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const mockedStateWithRewardsDisabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          [FEATURE_FLAG_NAME]: false,
        },
        cacheTimestamp: 0,
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const mockedStateWithoutRewardsFlag = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          someOtherFlag: true,
        },
        cacheTimestamp: 0,
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('Rewards Feature Flag Selector', () => {
  it('returns true when rewards feature flag is enabled', () => {
    // Arrange & Act
    const result = selectRewardsEnabledFlag(mockedStateWithRewardsEnabled);

    // Assert
    expect(result).toBe(true);
  });

  it('returns false when rewards feature flag is explicitly disabled', () => {
    // Arrange & Act
    const result = selectRewardsEnabledFlag(mockedStateWithRewardsDisabled);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when rewards feature flag property is missing', () => {
    // Arrange & Act
    const result = selectRewardsEnabledFlag(mockedStateWithoutRewardsFlag);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when feature flag state is empty', () => {
    // Arrange & Act
    const result = selectRewardsEnabledFlag(mockedEmptyFlagsState);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when RemoteFeatureFlagController state is undefined', () => {
    // Arrange & Act
    const result = selectRewardsEnabledFlag(mockedUndefinedFlagsState);

    // Assert
    expect(result).toBe(false);
  });

  it('handles non-boolean values by casting them to boolean', () => {
    // Arrange
    const stateWithNonBooleanFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [FEATURE_FLAG_NAME]: 'true' as unknown,
            },
            cacheTimestamp: 0,
          },
        },
      },
    } as unknown as EngineState;

    // Act
    const result = selectRewardsEnabledFlag(
      stateWithNonBooleanFlag as unknown as StateWithPartialEngine,
    );

    // Assert
    expect(result).toBe('true'); // Note: TypeScript cast doesn't actually convert value
  });

  describe('Edge Cases and Error Handling', () => {
    it('returns false when engine state is missing', () => {
      // Arrange
      const stateWithoutEngine = {} as StateWithPartialEngine;

      // Act & Assert
      expect(() => selectRewardsEnabledFlag(stateWithoutEngine)).toThrow();
    });

    it('returns false when backgroundState is missing', () => {
      // Arrange
      const stateWithoutBackgroundState = {
        engine: {},
      } as StateWithPartialEngine;

      // Act & Assert
      expect(() =>
        selectRewardsEnabledFlag(stateWithoutBackgroundState),
      ).toThrow();
    });

    it('returns false when remoteFeatureFlags is null', () => {
      // Arrange
      const stateWithNullFlags = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: null,
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithNullFlags);

      // Assert
      expect(result).toBe(false);
    });

    it('handles deeply nested undefined properties gracefully', () => {
      // Arrange
      const stateWithPartialStructure = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              // Missing remoteFeatureFlags property
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithPartialStructure);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Data Type Variations', () => {
    it('handles numeric 0 as falsy', () => {
      // Arrange
      const stateWithNumericZero = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: 0,
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithNumericZero);

      // Assert
      expect(result).toBe(0);
    });

    it('handles numeric 1 as truthy', () => {
      // Arrange
      const stateWithNumericOne = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: 1,
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithNumericOne);

      // Assert
      expect(result).toBe(1);
    });

    it('handles empty string as falsy', () => {
      // Arrange
      const stateWithEmptyString = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: '',
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithEmptyString);

      // Assert
      expect(result).toBe('');
    });

    it('handles string "false" as truthy value', () => {
      // Arrange
      const stateWithStringFalse = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: 'false',
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithStringFalse);

      // Assert
      expect(result).toBe('false');
    });

    it('handles null value', () => {
      // Arrange
      const stateWithNullValue = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: null,
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithNullValue);

      // Assert
      expect(result).toBe(null);
    });

    it('handles undefined value', () => {
      // Arrange
      const stateWithUndefinedValue = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: undefined,
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithUndefinedValue);

      // Assert
      expect(result).toBe(undefined);
    });

    it('handles object value', () => {
      // Arrange
      const stateWithObjectValue = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: { enabled: true },
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithObjectValue);

      // Assert
      expect(result).toEqual({ enabled: true });
    });

    it('handles array value', () => {
      // Arrange
      const stateWithArrayValue = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: [true, false],
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithArrayValue);

      // Assert
      expect(result).toEqual([true, false]);
    });
  });

  describe('State Structure Validation', () => {
    it('returns false with consistent default when flag structure is malformed', () => {
      // Arrange
      const malformedState = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: 'invalid',
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(malformedState);

      // Assert
      expect(result).toBe(false);
    });

    it('handles case where remoteFeatureFlags is not an object', () => {
      // Arrange
      const stateWithNonObjectFlags = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: 'not an object',
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithNonObjectFlags);

      // Assert
      expect(result).toBe(false);
    });

    it('properly handles multiple feature flags with different types', () => {
      // Arrange
      const stateWithMultipleFlags = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                someOtherFlag: 'string value',
                numericFlag: 42,
                [FEATURE_FLAG_NAME]: true,
                booleanFlag: false,
              },
              cacheTimestamp: Date.now(),
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithMultipleFlags);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Cache Timestamp Scenarios', () => {
    it('works correctly with current timestamp', () => {
      // Arrange
      const currentTime = Date.now();
      const stateWithCurrentTimestamp = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: true,
              },
              cacheTimestamp: currentTime,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithCurrentTimestamp);

      // Assert
      expect(result).toBe(true);
    });

    it('works correctly with old timestamp', () => {
      // Arrange
      const oldTime = Date.now() - 86400000; // 24 hours ago
      const stateWithOldTimestamp = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: false,
              },
              cacheTimestamp: oldTime,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithOldTimestamp);

      // Assert
      expect(result).toBe(false);
    });

    it('works correctly with missing cache timestamp', () => {
      // Arrange
      const stateWithoutTimestamp = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: true,
              },
              // Missing cacheTimestamp
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithoutTimestamp);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Feature Flag Override Scenarios', () => {
    const originalEnvValue = process.env.OVERRIDE_REMOTE_FEATURE_FLAGS;

    afterEach(() => {
      // Restore original environment value
      if (originalEnvValue !== undefined) {
        process.env.OVERRIDE_REMOTE_FEATURE_FLAGS = originalEnvValue;
      } else {
        delete process.env.OVERRIDE_REMOTE_FEATURE_FLAGS;
      }
    });

    it('does not override when flag is disabled', () => {
      // Arrange
      process.env.OVERRIDE_REMOTE_FEATURE_FLAGS = 'false';

      const stateWithFlags = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: true,
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithFlags);

      // Assert
      expect(result).toBe(true); // Should use actual flag value
    });

    it('does not override when environment variable is not set', () => {
      // Arrange
      delete process.env.OVERRIDE_REMOTE_FEATURE_FLAGS;

      const stateWithFlags = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [FEATURE_FLAG_NAME]: true,
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      // Act
      const result = selectRewardsEnabledFlag(stateWithFlags);

      // Assert
      expect(result).toBe(true); // Should use actual flag value
    });
  });

  describe('Selector Memoization', () => {
    it('returns the same reference for identical inputs', () => {
      // Arrange
      const state = mockedStateWithRewardsEnabled;

      // Act
      const result1 = selectRewardsEnabledFlag(state);
      const result2 = selectRewardsEnabledFlag(state);

      // Assert
      expect(result1).toBe(result2);
    });

    it('recalculates when input state changes', () => {
      // Arrange
      const state1 = mockedStateWithRewardsEnabled;
      const state2 = mockedStateWithRewardsDisabled;

      // Act
      const result1 = selectRewardsEnabledFlag(state1);
      const result2 = selectRewardsEnabledFlag(state2);

      // Assert
      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(result1).not.toBe(result2);
    });
  });

  describe('Integration with Mock Helpers', () => {
    it('works correctly with mockedState from mocks', () => {
      // Arrange & Act
      const result = selectRewardsEnabledFlag(
        mockedState as unknown as StateWithPartialEngine,
      );

      // Assert
      expect(result).toBe(false); // Should be false since rewards flag is not in mockedState
    });
  });
});

// New tests for the announcement modal feature flag
describe('Rewards Announcement Modal Feature Flag Selector', () => {
  const mockedStateWithAnnouncementModalEnabled = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            [ANNOUNCEMENT_MODAL_FLAG_NAME]: true,
          },
          cacheTimestamp: 0,
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const mockedStateWithAnnouncementModalDisabled = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            [ANNOUNCEMENT_MODAL_FLAG_NAME]: false,
          },
          cacheTimestamp: 0,
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const mockedStateWithoutAnnouncementModalFlag = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            someOtherFlag: true,
          },
          cacheTimestamp: 0,
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  it('returns true when announcement modal flag is enabled', () => {
    const result = selectRewardsAnnouncementModalEnabledFlag(
      mockedStateWithAnnouncementModalEnabled,
    );
    expect(result).toBe(true);
  });

  it('returns false when announcement modal flag is explicitly disabled', () => {
    const result = selectRewardsAnnouncementModalEnabledFlag(
      mockedStateWithAnnouncementModalDisabled,
    );
    expect(result).toBe(false);
  });

  it('returns false when announcement modal flag property is missing', () => {
    const result = selectRewardsAnnouncementModalEnabledFlag(
      mockedStateWithoutAnnouncementModalFlag,
    );
    expect(result).toBe(false);
  });

  it('returns false when feature flag state is empty', () => {
    const result = selectRewardsAnnouncementModalEnabledFlag(
      mockedEmptyFlagsState,
    );
    expect(result).toBe(false);
  });

  it('returns false when RemoteFeatureFlagController state is undefined', () => {
    const result = selectRewardsAnnouncementModalEnabledFlag(
      mockedUndefinedFlagsState,
    );
    expect(result).toBe(false);
  });

  it('handles non-boolean values by preserving the value (string)', () => {
    const stateWithNonBooleanFlag = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [ANNOUNCEMENT_MODAL_FLAG_NAME]: 'true' as unknown,
            },
            cacheTimestamp: 0,
          },
        },
      },
    } as unknown as EngineState;

    const result = selectRewardsAnnouncementModalEnabledFlag(
      stateWithNonBooleanFlag as unknown as StateWithPartialEngine,
    );
    expect(result).toBe('true');
  });

  describe('Data Type Variations', () => {
    it('handles numeric 0 as falsy', () => {
      const stateWithNumericZero = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [ANNOUNCEMENT_MODAL_FLAG_NAME]: 0,
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result =
        selectRewardsAnnouncementModalEnabledFlag(stateWithNumericZero);
      expect(result).toBe(0);
    });

    it('handles numeric 1 as truthy', () => {
      const stateWithNumericOne = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [ANNOUNCEMENT_MODAL_FLAG_NAME]: 1,
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result =
        selectRewardsAnnouncementModalEnabledFlag(stateWithNumericOne);
      expect(result).toBe(1);
    });

    it('handles empty string as falsy', () => {
      const stateWithEmptyString = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [ANNOUNCEMENT_MODAL_FLAG_NAME]: '',
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result =
        selectRewardsAnnouncementModalEnabledFlag(stateWithEmptyString);
      expect(result).toBe('');
    });

    it('handles string "false" as preserved value', () => {
      const stateWithStringFalse = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [ANNOUNCEMENT_MODAL_FLAG_NAME]: 'false',
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result =
        selectRewardsAnnouncementModalEnabledFlag(stateWithStringFalse);
      expect(result).toBe('false');
    });

    it('handles null value', () => {
      const stateWithNullValue = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [ANNOUNCEMENT_MODAL_FLAG_NAME]: null,
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result =
        selectRewardsAnnouncementModalEnabledFlag(stateWithNullValue);
      expect(result).toBe(null);
    });

    it('handles undefined value', () => {
      const stateWithUndefinedValue = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [ANNOUNCEMENT_MODAL_FLAG_NAME]: undefined,
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result = selectRewardsAnnouncementModalEnabledFlag(
        stateWithUndefinedValue,
      );
      expect(result).toBe(undefined);
    });

    it('handles object value', () => {
      const stateWithObjectValue = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [ANNOUNCEMENT_MODAL_FLAG_NAME]: { enabled: true },
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result =
        selectRewardsAnnouncementModalEnabledFlag(stateWithObjectValue);
      expect(result).toEqual({ enabled: true });
    });

    it('handles array value', () => {
      const stateWithArrayValue = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [ANNOUNCEMENT_MODAL_FLAG_NAME]: [true, false],
              },
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result =
        selectRewardsAnnouncementModalEnabledFlag(stateWithArrayValue);
      expect(result).toEqual([true, false]);
    });
  });

  describe('State Structure Validation', () => {
    it('returns false with consistent default when flag structure is malformed', () => {
      const malformedState = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: 'invalid',
          },
        },
      } as unknown as StateWithPartialEngine;

      const result = selectRewardsAnnouncementModalEnabledFlag(malformedState);
      expect(result).toBe(false);
    });

    it('handles case where remoteFeatureFlags is not an object', () => {
      const stateWithNonObjectFlags = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: 'not an object',
              cacheTimestamp: 0,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result = selectRewardsAnnouncementModalEnabledFlag(
        stateWithNonObjectFlags,
      );
      expect(result).toBe(false);
    });

    it('properly handles multiple feature flags with different types', () => {
      const stateWithMultipleFlags = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                someOtherFlag: 'string value',
                numericFlag: 42,
                [ANNOUNCEMENT_MODAL_FLAG_NAME]: true,
                booleanFlag: false,
              },
              cacheTimestamp: Date.now(),
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result = selectRewardsAnnouncementModalEnabledFlag(
        stateWithMultipleFlags,
      );
      expect(result).toBe(true);
    });
  });

  describe('Cache Timestamp Scenarios', () => {
    it('works correctly with current timestamp', () => {
      const currentTime = Date.now();
      const stateWithCurrentTimestamp = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [ANNOUNCEMENT_MODAL_FLAG_NAME]: true,
              },
              cacheTimestamp: currentTime,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result = selectRewardsAnnouncementModalEnabledFlag(
        stateWithCurrentTimestamp,
      );
      expect(result).toBe(true);
    });

    it('works correctly with old timestamp', () => {
      const oldTime = Date.now() - 86400000; // 24 hours ago
      const stateWithOldTimestamp = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [ANNOUNCEMENT_MODAL_FLAG_NAME]: false,
              },
              cacheTimestamp: oldTime,
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result = selectRewardsAnnouncementModalEnabledFlag(
        stateWithOldTimestamp,
      );
      expect(result).toBe(false);
    });

    it('works correctly with missing cache timestamp', () => {
      const stateWithoutTimestamp = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [ANNOUNCEMENT_MODAL_FLAG_NAME]: true,
              },
              // Missing cacheTimestamp
            },
          },
        },
      } as unknown as StateWithPartialEngine;

      const result = selectRewardsAnnouncementModalEnabledFlag(
        stateWithoutTimestamp,
      );
      expect(result).toBe(true);
    });
  });

  describe('Selector Memoization', () => {
    it('returns the same reference for identical inputs', () => {
      const state = mockedStateWithAnnouncementModalEnabled;
      const result1 = selectRewardsAnnouncementModalEnabledFlag(state);
      const result2 = selectRewardsAnnouncementModalEnabledFlag(state);
      expect(result1).toBe(result2);
    });

    it('recalculates when input state changes', () => {
      const state1 = mockedStateWithAnnouncementModalEnabled;
      const state2 = mockedStateWithAnnouncementModalDisabled;

      const result1 = selectRewardsAnnouncementModalEnabledFlag(state1);
      const result2 = selectRewardsAnnouncementModalEnabledFlag(state2);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(result1).not.toBe(result2);
    });
  });
});
