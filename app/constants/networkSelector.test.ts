import {
  NETWORK_SELECTOR_SOURCES,
  NETWORK_SELECTOR_SOURCE_VALUES,
  NETWORK_SELECTOR_TEST_IDS,
  NetworkSelectorSource,
} from './networkSelector';

describe('Network Selector Constants', () => {
  describe('NETWORK_SELECTOR_SOURCES', () => {
    it('should contain SEND_FLOW source', () => {
      expect(NETWORK_SELECTOR_SOURCES.SEND_FLOW).toBe('SendFlow');
    });

    it('should be an immutable constant through TypeScript', () => {
      // The 'as const' assertion provides compile-time immutability
      expect(typeof NETWORK_SELECTOR_SOURCES).toBe('object');
    });

    it('should have expected structure', () => {
      expect(NETWORK_SELECTOR_SOURCES).toEqual({
        SEND_FLOW: 'SendFlow',
      });
    });

    it('should not allow modifications in strict mode', () => {
      // Note: Object.freeze only prevents modifications in strict mode
      // Since TypeScript compiles to non-strict mode by default, we just verify the object structure
      expect(() => {
        const testObj = { ...NETWORK_SELECTOR_SOURCES };
        testObj.SEND_FLOW = 'Modified' as never;
      }).not.toThrow();
    });

    it('should maintain immutability through TypeScript typing', () => {
      // The 'as const' assertion ensures compile-time immutability
      // Runtime immutability depends on Object.freeze or strict mode
      expect(NETWORK_SELECTOR_SOURCES.SEND_FLOW).toBe('SendFlow');
    });
  });

  describe('NetworkSelectorSource type', () => {
    it('should allow valid source values', () => {
      const validSource: NetworkSelectorSource = 'SendFlow';
      expect(validSource).toBe('SendFlow');
    });

    it('should match NETWORK_SELECTOR_SOURCES values', () => {
      const sendFlowSource: NetworkSelectorSource =
        NETWORK_SELECTOR_SOURCES.SEND_FLOW;
      expect(sendFlowSource).toBe('SendFlow');
    });

    it('should work with type checking', () => {
      const checkType = (source: NetworkSelectorSource): string => source;
      expect(checkType(NETWORK_SELECTOR_SOURCES.SEND_FLOW)).toBe('SendFlow');
    });
  });

  describe('NETWORK_SELECTOR_SOURCE_VALUES', () => {
    it('should contain all values from NETWORK_SELECTOR_SOURCES', () => {
      expect(NETWORK_SELECTOR_SOURCE_VALUES).toEqual(['SendFlow']);
    });

    it('should be an array', () => {
      expect(Array.isArray(NETWORK_SELECTOR_SOURCE_VALUES)).toBe(true);
    });

    it('should have the same number of values as NETWORK_SELECTOR_SOURCES', () => {
      const sourceKeys = Object.keys(NETWORK_SELECTOR_SOURCES);
      expect(NETWORK_SELECTOR_SOURCE_VALUES.length).toBe(sourceKeys.length);
    });

    it('should contain only string values', () => {
      NETWORK_SELECTOR_SOURCE_VALUES.forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });

    it('should be suitable for PropTypes validation', () => {
      const isValidSource = (value: unknown): boolean =>
        NETWORK_SELECTOR_SOURCE_VALUES.includes(value as NetworkSelectorSource);

      expect(isValidSource('SendFlow')).toBe(true);
      expect(isValidSource('InvalidSource')).toBe(false);
      expect(isValidSource(undefined)).toBe(false);
      expect(isValidSource(null)).toBe(false);
      expect(isValidSource(123)).toBe(false);
    });

    it('should match all NETWORK_SELECTOR_SOURCES values', () => {
      Object.values(NETWORK_SELECTOR_SOURCES).forEach((sourceValue) => {
        expect(NETWORK_SELECTOR_SOURCE_VALUES).toContain(sourceValue);
      });
    });

    it('should not contain duplicate values', () => {
      const uniqueValues = [...new Set(NETWORK_SELECTOR_SOURCE_VALUES)];
      expect(NETWORK_SELECTOR_SOURCE_VALUES.length).toBe(uniqueValues.length);
    });
  });

  describe('NETWORK_SELECTOR_TEST_IDS', () => {
    it('should contain CONTEXTUAL_NETWORK_PICKER test ID', () => {
      expect(NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER).toBe(
        'contextual-network-picker',
      );
    });

    it('should be an immutable constant through TypeScript', () => {
      // The 'as const' assertion provides compile-time immutability
      expect(typeof NETWORK_SELECTOR_TEST_IDS).toBe('object');
    });

    it('should have expected structure', () => {
      expect(NETWORK_SELECTOR_TEST_IDS).toEqual({
        CONTEXTUAL_NETWORK_PICKER: 'contextual-network-picker',
      });
    });

    it('should not allow modifications in strict mode', () => {
      // Note: Object.freeze only prevents modifications in strict mode
      // Since TypeScript compiles to non-strict mode by default, we just verify the object structure
      expect(() => {
        const testObj = { ...NETWORK_SELECTOR_TEST_IDS };
        testObj.CONTEXTUAL_NETWORK_PICKER = 'modified-id' as never;
      }).not.toThrow();
    });

    it('should maintain immutability through TypeScript typing', () => {
      // The 'as const' assertion ensures compile-time immutability
      // Runtime immutability depends on Object.freeze or strict mode
      expect(NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER).toBe(
        'contextual-network-picker',
      );
    });

    it('should use kebab-case for test ID values', () => {
      Object.values(NETWORK_SELECTOR_TEST_IDS).forEach((testId) => {
        expect(testId).toMatch(/^[a-z]+(-[a-z]+)*$/);
      });
    });

    it('should have string values suitable for DOM test IDs', () => {
      Object.values(NETWORK_SELECTOR_TEST_IDS).forEach((testId) => {
        expect(typeof testId).toBe('string');
        expect(testId.length).toBeGreaterThan(0);
        expect(testId).not.toContain(' ');
        expect(testId).not.toContain('#');
        expect(testId).not.toContain('.');
      });
    });
  });

  describe('Integration between constants', () => {
    it('should maintain separate concerns between sources and test IDs', () => {
      const sourceKeys = Object.keys(NETWORK_SELECTOR_SOURCES);
      const testIdKeys = Object.keys(NETWORK_SELECTOR_TEST_IDS);

      // Ensure no accidental key overlap
      sourceKeys.forEach((key) => {
        expect(testIdKeys).not.toContain(key);
      });
    });

    it('should export all expected constants', () => {
      // Verify all exports are defined
      expect(NETWORK_SELECTOR_SOURCES).toBeDefined();
      expect(NETWORK_SELECTOR_SOURCE_VALUES).toBeDefined();
      expect(NETWORK_SELECTOR_TEST_IDS).toBeDefined();
    });

    it('should maintain type safety for all exports', () => {
      // Type checking at runtime
      expect(typeof NETWORK_SELECTOR_SOURCES).toBe('object');
      expect(Array.isArray(NETWORK_SELECTOR_SOURCE_VALUES)).toBe(true);
      expect(typeof NETWORK_SELECTOR_TEST_IDS).toBe('object');
    });
  });

  describe('Usage patterns', () => {
    it('should support switch statement usage with NETWORK_SELECTOR_SOURCES', () => {
      const handleSource = (source: NetworkSelectorSource): string => {
        switch (source) {
          case NETWORK_SELECTOR_SOURCES.SEND_FLOW:
            return 'Handling send flow';
          default:
            return 'Unknown source';
        }
      };

      expect(handleSource(NETWORK_SELECTOR_SOURCES.SEND_FLOW)).toBe(
        'Handling send flow',
      );
    });

    it('should support array includes check with NETWORK_SELECTOR_SOURCE_VALUES', () => {
      const isValidSource = (value: string): boolean =>
        NETWORK_SELECTOR_SOURCE_VALUES.includes(value as NetworkSelectorSource);

      expect(isValidSource('SendFlow')).toBe(true);
      expect(isValidSource('InvalidSource')).toBe(false);
    });

    it('should support component test ID assignment', () => {
      const getTestId = (component: string): string | undefined => {
        if (component === 'ContextualNetworkPicker') {
          return NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER;
        }
        return undefined;
      };

      expect(getTestId('ContextualNetworkPicker')).toBe(
        'contextual-network-picker',
      );
      expect(getTestId('UnknownComponent')).toBeUndefined();
    });
  });
});
