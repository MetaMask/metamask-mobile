import {
  selectBlockedWallets,
  selectIsWalletBlocked,
  selectAreAnyWalletsBlocked,
  selectWalletComplianceStatusMap,
  selectComplianceLastCheckedAt,
} from './complianceController';

const BLOCKED_ADDRESS = '0xBLOCKED';
const BLOCKED_ADDRESS_2 = '0xBLOCKED2';
const SAFE_ADDRESS = '0xSAFE';
const SAFE_ADDRESS_2 = '0xSAFE2';

function buildState(complianceState?: Record<string, unknown>) {
  return {
    engine: {
      backgroundState: {
        ComplianceController: complianceState,
      },
    },
  } as Parameters<ReturnType<typeof selectIsWalletBlocked>>[0];
}

describe('complianceController selectors', () => {
  describe('selectBlockedWallets', () => {
    it('returns null when blockedWallets is not set', () => {
      const state = buildState({
        blockedWallets: null,
        walletComplianceStatusMap: {},
        blockedWalletsLastFetched: 0,
        lastCheckedAt: null,
      });
      expect(selectBlockedWallets(state)).toBeNull();
    });

    it('returns the blocked wallets info when populated', () => {
      const blockedWallets = {
        addresses: [BLOCKED_ADDRESS],
        sources: { ofac: 1, remote: 0 },
        lastUpdated: '2025-01-01T00:00:00Z',
        fetchedAt: '2025-01-01T00:00:00Z',
      };
      const state = buildState({
        blockedWallets,
        walletComplianceStatusMap: {},
        blockedWalletsLastFetched: 1000,
        lastCheckedAt: null,
      });
      expect(selectBlockedWallets(state)).toEqual(blockedWallets);
    });
  });

  describe('selectIsWalletBlocked', () => {
    it('returns true when address is in the blocklist', () => {
      const state = buildState({
        blockedWallets: {
          addresses: [BLOCKED_ADDRESS],
          sources: { ofac: 1, remote: 0 },
          lastUpdated: '2025-01-01T00:00:00Z',
          fetchedAt: '2025-01-01T00:00:00Z',
        },
        walletComplianceStatusMap: {},
        blockedWalletsLastFetched: 1000,
        lastCheckedAt: null,
      });

      expect(selectIsWalletBlocked(BLOCKED_ADDRESS)(state)).toBe(true);
    });

    it('returns false when address is not blocked', () => {
      const state = buildState({
        blockedWallets: {
          addresses: [BLOCKED_ADDRESS],
          sources: { ofac: 1, remote: 0 },
          lastUpdated: '2025-01-01T00:00:00Z',
          fetchedAt: '2025-01-01T00:00:00Z',
        },
        walletComplianceStatusMap: {},
        blockedWalletsLastFetched: 1000,
        lastCheckedAt: null,
      });

      expect(selectIsWalletBlocked(SAFE_ADDRESS)(state)).toBe(false);
    });

    it('falls back to walletComplianceStatusMap when blocklist is null', () => {
      const state = buildState({
        blockedWallets: null,
        walletComplianceStatusMap: {
          [BLOCKED_ADDRESS]: {
            address: BLOCKED_ADDRESS,
            blocked: true,
            checkedAt: '2025-01-01T00:00:00Z',
          },
        },
        blockedWalletsLastFetched: 0,
        lastCheckedAt: '2025-01-01T00:00:00Z',
      });

      expect(selectIsWalletBlocked(BLOCKED_ADDRESS)(state)).toBe(true);
    });

    it('returns false when controller state is undefined', () => {
      const state = buildState(undefined);
      expect(selectIsWalletBlocked(BLOCKED_ADDRESS)(state)).toBe(false);
    });

    it('returns the same selector instance for the same address (memoized)', () => {
      expect(selectIsWalletBlocked(BLOCKED_ADDRESS)).toBe(
        selectIsWalletBlocked(BLOCKED_ADDRESS),
      );
      expect(selectIsWalletBlocked(SAFE_ADDRESS)).not.toBe(
        selectIsWalletBlocked(BLOCKED_ADDRESS),
      );
    });
  });

  describe('selectAreAnyWalletsBlocked', () => {
    it('returns true when one of the addresses is blocked', () => {
      const state = buildState({
        blockedWallets: {
          addresses: [BLOCKED_ADDRESS],
          sources: { ofac: 1, remote: 0 },
          lastUpdated: '2025-01-01T00:00:00Z',
          fetchedAt: '2025-01-01T00:00:00Z',
        },
        walletComplianceStatusMap: {},
        blockedWalletsLastFetched: 1000,
        lastCheckedAt: null,
      });

      expect(
        selectAreAnyWalletsBlocked([SAFE_ADDRESS, BLOCKED_ADDRESS])(state),
      ).toBe(true);
    });

    it('returns false when none of the addresses is blocked', () => {
      const state = buildState({
        blockedWallets: {
          addresses: [BLOCKED_ADDRESS],
          sources: { ofac: 1, remote: 0 },
          lastUpdated: '2025-01-01T00:00:00Z',
          fetchedAt: '2025-01-01T00:00:00Z',
        },
        walletComplianceStatusMap: {},
        blockedWalletsLastFetched: 1000,
        lastCheckedAt: null,
      });

      expect(
        selectAreAnyWalletsBlocked([SAFE_ADDRESS, SAFE_ADDRESS_2])(state),
      ).toBe(false);
    });

    it('returns true when multiple addresses are blocked', () => {
      const state = buildState({
        blockedWallets: {
          addresses: [BLOCKED_ADDRESS, BLOCKED_ADDRESS_2],
          sources: { ofac: 2, remote: 0 },
          lastUpdated: '2025-01-01T00:00:00Z',
          fetchedAt: '2025-01-01T00:00:00Z',
        },
        walletComplianceStatusMap: {},
        blockedWalletsLastFetched: 1000,
        lastCheckedAt: null,
      });

      expect(
        selectAreAnyWalletsBlocked([BLOCKED_ADDRESS, BLOCKED_ADDRESS_2])(state),
      ).toBe(true);
    });

    it('returns false for empty addresses array', () => {
      const state = buildState({
        blockedWallets: {
          addresses: [BLOCKED_ADDRESS],
          sources: { ofac: 1, remote: 0 },
          lastUpdated: '2025-01-01T00:00:00Z',
          fetchedAt: '2025-01-01T00:00:00Z',
        },
        walletComplianceStatusMap: {},
        blockedWalletsLastFetched: 1000,
        lastCheckedAt: null,
      });

      expect(selectAreAnyWalletsBlocked([])(state)).toBe(false);
    });

    it('returns false when controller state is undefined', () => {
      const state = buildState(undefined);
      expect(selectAreAnyWalletsBlocked([BLOCKED_ADDRESS])(state)).toBe(false);
    });

    it('returns the same selector instance for the same address set (memoized, order-independent)', () => {
      const sel1 = selectAreAnyWalletsBlocked([SAFE_ADDRESS, BLOCKED_ADDRESS]);
      const sel2 = selectAreAnyWalletsBlocked([BLOCKED_ADDRESS, SAFE_ADDRESS]);
      expect(sel1).toBe(sel2);
    });
  });

  describe('selectWalletComplianceStatusMap', () => {
    it('returns the status map', () => {
      const statusMap = {
        [SAFE_ADDRESS]: {
          address: SAFE_ADDRESS,
          blocked: false,
          checkedAt: '2025-01-01T00:00:00Z',
        },
      };
      const state = buildState({
        blockedWallets: null,
        walletComplianceStatusMap: statusMap,
        blockedWalletsLastFetched: 0,
        lastCheckedAt: null,
      });
      expect(selectWalletComplianceStatusMap(state)).toEqual(statusMap);
    });

    it('returns empty object when state is undefined', () => {
      const state = buildState(undefined);
      expect(selectWalletComplianceStatusMap(state)).toEqual({});
    });
  });

  describe('selectComplianceLastCheckedAt', () => {
    it('returns the last checked timestamp', () => {
      const state = buildState({
        blockedWallets: null,
        walletComplianceStatusMap: {},
        blockedWalletsLastFetched: 0,
        lastCheckedAt: '2025-06-15T10:00:00Z',
      });
      expect(selectComplianceLastCheckedAt(state)).toBe('2025-06-15T10:00:00Z');
    });

    it('returns null when not yet checked', () => {
      const state = buildState({
        blockedWallets: null,
        walletComplianceStatusMap: {},
        blockedWalletsLastFetched: 0,
        lastCheckedAt: null,
      });
      expect(selectComplianceLastCheckedAt(state)).toBeNull();
    });
  });
});
