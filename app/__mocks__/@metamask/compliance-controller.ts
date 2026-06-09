/**
 * Manual mock for @metamask/compliance-controller.
 *
 * Reflects the public API surface: the bulk-fetch blocklist pattern.
 * Compliance status is populated exclusively via per-address checks.
 */

export class ComplianceService {
  readonly name = 'ComplianceService';

  constructor(args: Record<string, unknown>) {
    Object.assign(this, args);
  }
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

function findWalletComplianceStatus(
  walletComplianceStatusMap: Record<string, { blocked: boolean } | undefined>,
  address: string,
) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return walletComplianceStatusMap[address];
  }

  return Object.entries(walletComplianceStatusMap).find(
    ([cachedAddress]) => cachedAddress.toLowerCase() === address.toLowerCase(),
  )?.[1];
}

export function selectIsWalletBlocked(address: string) {
  return (state: {
    walletComplianceStatusMap?: Record<
      string,
      { blocked: boolean } | undefined
    >;
  }): boolean =>
    findWalletComplianceStatus(state.walletComplianceStatusMap ?? {}, address)
      ?.blocked ?? false;
}

export function selectAreAnyWalletsBlocked(addresses: string[]) {
  return (state: {
    walletComplianceStatusMap?: Record<
      string,
      { blocked: boolean } | undefined
    >;
  }): boolean =>
    addresses.some(
      (address) =>
        findWalletComplianceStatus(
          state.walletComplianceStatusMap ?? {},
          address,
        )?.blocked ?? false,
    );
}
