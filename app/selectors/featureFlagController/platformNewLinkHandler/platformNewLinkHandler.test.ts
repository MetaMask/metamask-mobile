import {
  selectPlatformNewLinkHandlerSystemEnabled,
  selectPlatformNewLinkHandlerActions,
  NEW_LINK_HANDLER_SYSTEM_FLAG,
  NEW_LINK_HANDLER_ACTIONS_FLAG,
} from './platformNewLinkHandler';

describe('Platform New Link Handler Selectors', () => {
  const createMockState = (remoteFeatureFlags = {}) => ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags,
          cacheTimestamp: 0,
        },
      },
    },
  });

  describe('selectPlatformNewLinkHandlerSystemEnabled', () => {
    it('returns true when system flag is enabled', () => {
      const state = createMockState({
        [NEW_LINK_HANDLER_SYSTEM_FLAG]: true,
      });

      const result = selectPlatformNewLinkHandlerSystemEnabled(state);

      expect(result).toBe(true);
    });

    it('returns false when system flag is disabled', () => {
      const state = createMockState({
        [NEW_LINK_HANDLER_SYSTEM_FLAG]: false,
      });

      const result = selectPlatformNewLinkHandlerSystemEnabled(state);

      expect(result).toBe(false);
    });

    it('returns false when system flag is missing', () => {
      const state = createMockState({});

      const result = selectPlatformNewLinkHandlerSystemEnabled(state);

      expect(result).toBe(false);
    });

    it('returns false when system flag is null', () => {
      const state = createMockState({
        [NEW_LINK_HANDLER_SYSTEM_FLAG]: null,
      });

      const result = selectPlatformNewLinkHandlerSystemEnabled(state);

      expect(result).toBe(false);
    });

    it('returns false when system flag is undefined', () => {
      const state = createMockState({
        [NEW_LINK_HANDLER_SYSTEM_FLAG]: undefined,
      });

      const result = selectPlatformNewLinkHandlerSystemEnabled(state);

      expect(result).toBe(false);
    });
  });

  describe('selectPlatformNewLinkHandlerActions', () => {
    it('returns actions object when properly formatted', () => {
      const state = createMockState({
        [NEW_LINK_HANDLER_ACTIONS_FLAG]: {
          home: true,
          swap: false,
          send: true,
        },
      });

      const result = selectPlatformNewLinkHandlerActions(state);

      expect(result).toEqual({
        home: true,
        swap: false,
        send: true,
      });
    });

    it('returns empty object when actions flag is missing', () => {
      const state = createMockState({});

      const result = selectPlatformNewLinkHandlerActions(state);

      expect(result).toEqual({});
    });

    it('returns empty object when actions flag is null', () => {
      const state = createMockState({
        [NEW_LINK_HANDLER_ACTIONS_FLAG]: null,
      });

      const result = selectPlatformNewLinkHandlerActions(state);

      expect(result).toEqual({});
    });

    it('returns empty object when actions flag is an array', () => {
      const state = createMockState({
        [NEW_LINK_HANDLER_ACTIONS_FLAG]: ['home', 'swap'],
      });

      const result = selectPlatformNewLinkHandlerActions(state);

      expect(result).toEqual({});
    });

    it('returns empty object when actions flag is a string', () => {
      const state = createMockState({
        [NEW_LINK_HANDLER_ACTIONS_FLAG]: 'invalid',
      });

      const result = selectPlatformNewLinkHandlerActions(state);

      expect(result).toEqual({});
    });

    it('returns empty object when actions flag is a number', () => {
      const state = createMockState({
        [NEW_LINK_HANDLER_ACTIONS_FLAG]: 123,
      });

      const result = selectPlatformNewLinkHandlerActions(state);

      expect(result).toEqual({});
    });

    it('returns empty object when actions flag is a boolean', () => {
      const state = createMockState({
        [NEW_LINK_HANDLER_ACTIONS_FLAG]: true,
      });

      const result = selectPlatformNewLinkHandlerActions(state);

      expect(result).toEqual({});
    });
  });
});
