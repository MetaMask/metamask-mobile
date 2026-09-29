/**
 * Manual mock for @metamask/compliance-controller.
 *
 * Reflects the public API surface: the bulk-fetch blocklist pattern.
 * Compliance status is populated exclusively via per-address checks.
 */

interface ComplianceServiceOptions {
  messenger: unknown;
  fetch: typeof fetch;
  apiUrl?: string;
  env?: 'production' | 'development';
}

export class ComplianceService {
  readonly name = 'ComplianceService';

  constructor(args: ComplianceServiceOptions) {
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
  const exactMatch = walletComplianceStatusMap[address];
  if (exactMatch !== undefined) {
    return exactMatch;
  }

  // Non-EVM addresses: no case-insensitive fallback (mirrors real package behaviour).
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return undefined;
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
