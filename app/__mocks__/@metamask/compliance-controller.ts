/**
 * Manual mock for @metamask/compliance-controller.
 *
 * Reflects the v2.0.0 public API surface: the bulk-fetch blocklist pattern.
 * Compliance status is populated exclusively via per-address checks.
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

  clearComplianceState(): void {
    // noop
  }
}

export function getDefaultComplianceControllerState() {
  return {
    walletComplianceStatusMap: {},
    lastCheckedAt: null,
  };
}

export function selectIsWalletBlocked(address: string) {
  return (state: {
    walletComplianceStatusMap?: Record<
      string,
      { blocked: boolean } | undefined
    >;
  }): boolean => state.walletComplianceStatusMap?.[address]?.blocked ?? false;
}
