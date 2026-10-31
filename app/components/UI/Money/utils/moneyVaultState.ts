import BigNumber from 'bignumber.js';

export const MoneyVaultKind = {
  Base: 'base',
  Premium: 'premium',
} as const;

export type MoneyVaultKind =
  (typeof MoneyVaultKind)[keyof typeof MoneyVaultKind];

export const MoneyVaultStatus = {
  Base: 'base',
  Premium: 'premium',
  Upgrading: 'upgrading',
  Downgrading: 'downgrading',
} as const;

export type MoneyVaultStatus =
  (typeof MoneyVaultStatus)[keyof typeof MoneyVaultStatus];

export interface MoneyVaultPositionLike {
  vault_address?: string;
  vault_key?: string;
  current_value_usd?: string;
}

export interface GetMoneyVaultStateParams {
  isEntitled: boolean;
  positions: MoneyVaultPositionLike[] | undefined;
  baseVaultAddress: string | undefined;
  premiumVaultAddress: string | undefined;
  baseApyDecimal: number | undefined;
  premiumApyDecimal: number | undefined;
  /**
   * When true, positions have not settled yet. Falls back to the entitlement
   * alone so the APY number does not flicker during the first load.
   */
  positionsUnavailable?: boolean;
}

export interface MoneyVaultState {
  status: MoneyVaultStatus;
  currentVault: MoneyVaultKind;
  effectiveApyDecimal: number | undefined;
  /**
   * True when `effectiveApyDecimal` is the base vault rate, or a blend that
   * includes it. Premium-only states do not wait on the base APY query.
   */
  usesBaseApy: boolean;
}

const ZERO = new BigNumber(0);

const normalizeAddress = (address: string | undefined): string | undefined =>
  address?.toLowerCase();

const parseUsd = (value: string | undefined): BigNumber => {
  if (value === undefined) {
    return ZERO;
  }
  const parsed = new BigNumber(value);
  if (parsed.isNaN() || !parsed.isFinite() || parsed.lte(0)) {
    return ZERO;
  }
  return parsed;
};

/**
 * Whether a position USD string is a positive finite amount.
 *
 * @param value - `current_value_usd` from a vault position.
 * @returns True when the value is a finite number greater than zero.
 */
export const hasPositiveUsd = (value: string | undefined): boolean =>
  parseUsd(value).gt(0);

const matchesVault = (
  position: MoneyVaultPositionLike,
  vaultAddress: string | undefined,
  vaultKey: string,
): boolean => {
  const normalizedVault = normalizeAddress(vaultAddress);
  const normalizedPosition = normalizeAddress(position.vault_address);
  if (normalizedVault && normalizedPosition === normalizedVault) {
    return true;
  }
  return position.vault_key === vaultKey;
};

const getVaultBalances = ({
  positions,
  baseVaultAddress,
  premiumVaultAddress,
}: Pick<
  GetMoneyVaultStateParams,
  'positions' | 'baseVaultAddress' | 'premiumVaultAddress'
>): { baseUsd: BigNumber; premiumUsd: BigNumber } => {
  let baseUsd = ZERO;
  let premiumUsd = ZERO;

  for (const position of positions ?? []) {
    const value = parseUsd(position.current_value_usd);
    if (value.lte(0)) {
      continue;
    }
    if (matchesVault(position, baseVaultAddress, 'standard')) {
      baseUsd = baseUsd.plus(value);
      continue;
    }
    if (matchesVault(position, premiumVaultAddress, 'premium')) {
      premiumUsd = premiumUsd.plus(value);
    }
  }

  return { baseUsd, premiumUsd };
};

const weightedApy = ({
  baseUsd,
  premiumUsd,
  baseApy,
  premiumApy,
}: {
  baseUsd: BigNumber;
  premiumUsd: BigNumber;
  baseApy: number | undefined;
  premiumApy: number | undefined;
}): number | undefined => {
  const total = baseUsd.plus(premiumUsd);
  if (total.lte(0)) {
    return undefined;
  }

  // A missing leg is not a zero rate. Publishing the other vault's APY would
  // close Money home's time-to-content span before GET_VAULT_APY returns.
  if (
    (baseUsd.gt(0) && baseApy === undefined) ||
    (premiumUsd.gt(0) && premiumApy === undefined)
  ) {
    return undefined;
  }

  let weighted = ZERO;
  let weight = ZERO;

  if (baseUsd.gt(0) && baseApy !== undefined) {
    weighted = weighted.plus(baseUsd.multipliedBy(baseApy));
    weight = weight.plus(baseUsd);
  }
  if (premiumUsd.gt(0) && premiumApy !== undefined) {
    weighted = weighted.plus(premiumUsd.multipliedBy(premiumApy));
    weight = weight.plus(premiumUsd);
  }

  if (weight.lte(0)) {
    return undefined;
  }

  return weighted.dividedBy(weight).toNumber();
};

/**
 * Derives Money vault status and the APY to show from entitlement and
 * positions.
 *
 * Status reflects whether funds have finished migrating after a subscribe or
 * lapse. The effective APY is always that of the vault holding the funds. When
 * funds are split, it is the USD-weighted average of the two vault APYs.
 *
 * @param params - Entitlement, positions, vault addresses, and vault APYs.
 * @returns Status, current vault kind, and effective APY decimal.
 */
export const getMoneyVaultState = ({
  isEntitled,
  positions,
  baseVaultAddress,
  premiumVaultAddress,
  baseApyDecimal,
  premiumApyDecimal,
  positionsUnavailable = false,
}: GetMoneyVaultStateParams): MoneyVaultState => {
  if (positionsUnavailable || positions === undefined) {
    return {
      status: isEntitled ? MoneyVaultStatus.Premium : MoneyVaultStatus.Base,
      currentVault: isEntitled ? MoneyVaultKind.Premium : MoneyVaultKind.Base,
      effectiveApyDecimal: isEntitled ? premiumApyDecimal : baseApyDecimal,
      usesBaseApy: !isEntitled,
    };
  }

  const { baseUsd, premiumUsd } = getVaultBalances({
    positions,
    baseVaultAddress,
    premiumVaultAddress,
  });

  const inBase = baseUsd.gt(0);
  const inPremium = premiumUsd.gt(0);

  if (isEntitled) {
    if (inBase) {
      return {
        status: MoneyVaultStatus.Upgrading,
        currentVault: MoneyVaultKind.Base,
        effectiveApyDecimal: inPremium
          ? weightedApy({
              baseUsd,
              premiumUsd,
              baseApy: baseApyDecimal,
              premiumApy: premiumApyDecimal,
            })
          : baseApyDecimal,
        usesBaseApy: true,
      };
    }
    return {
      status: MoneyVaultStatus.Premium,
      currentVault: MoneyVaultKind.Premium,
      effectiveApyDecimal: premiumApyDecimal,
      usesBaseApy: false,
    };
  }

  if (inPremium) {
    return {
      status: MoneyVaultStatus.Downgrading,
      currentVault: MoneyVaultKind.Premium,
      effectiveApyDecimal: inBase
        ? weightedApy({
            baseUsd,
            premiumUsd,
            baseApy: baseApyDecimal,
            premiumApy: premiumApyDecimal,
          })
        : premiumApyDecimal,
      usesBaseApy: inBase,
    };
  }

  return {
    status: MoneyVaultStatus.Base,
    currentVault: MoneyVaultKind.Base,
    effectiveApyDecimal: baseApyDecimal,
    usesBaseApy: true,
  };
};
