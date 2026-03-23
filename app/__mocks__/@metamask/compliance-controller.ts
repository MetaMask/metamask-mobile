/**
 * Manual mock for @metamask/compliance-controller.
 *
 * The npm package is published but dist/ artifacts may not yet be available.
 * This mock provides the public API surface needed for tests and TypeScript
 * compilation within the mobile repo.
 */

export class ComplianceService {
  readonly name = 'ComplianceService';
}

export class ComplianceController {
  readonly name = 'ComplianceController';
  state: Record<string, unknown>;

  constructor(args: Record<string, unknown>) {
    this.state = (args.state ?? {}) as Record<string, unknown>;
  }

  async init(): Promise<void> {
    // noop
  }

  async checkWalletCompliance(
    address: string,
  ): Promise<{ address: string; blocked: boolean; checkedAt: string }> {
    return { address, blocked: false, checkedAt: new Date().toISOString() };
  }

  async checkWalletsCompliance(
    addresses: string[],
  ): Promise<{ address: string; blocked: boolean; checkedAt: string }[]> {
    return addresses.map((a) => ({
      address: a,
      blocked: false,
      checkedAt: new Date().toISOString(),
    }));
  }

  async updateBlockedWallets(): Promise<{
    addresses: string[];
    sources: { ofac: number; remote: number };
    lastUpdated: string;
    fetchedAt: string;
  }> {
    return {
      addresses: [],
      sources: { ofac: 0, remote: 0 },
      lastUpdated: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
    };
  }

  clearComplianceState(): void {
    // noop
  }
}

export function getDefaultComplianceControllerState() {
  return {
    walletComplianceStatusMap: {},
    blockedWallets: null,
    blockedWalletsLastFetched: 0,
    lastCheckedAt: null,
  };
}

export function selectIsWalletBlocked(address: string) {
  return (state: {
    blockedWallets?: { addresses: string[] } | null;
    walletComplianceStatusMap?: Record<
      string,
      { blocked: boolean } | undefined
    >;
  }): boolean => {
    if (state.blockedWallets?.addresses.includes(address)) {
      return true;
    }
    return state.walletComplianceStatusMap?.[address]?.blocked ?? false;
  };
}
