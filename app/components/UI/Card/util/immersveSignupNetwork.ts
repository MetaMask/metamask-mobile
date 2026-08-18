import type {
  ImmersveMonadConfig,
  ImmersveProgramConfig,
} from '../../../../selectors/featureFlagController/card';

export const IMMERSVE_MONAD_NETWORK = 'monad-mainnet';

export type ImmersveNetworkProgramKey = keyof Pick<
  ImmersveMonadConfig,
  'fundingChannelId' | 'cardProgramId' | 'spenderAddress'
>;

const isNonEmptyObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).length > 0;

/**
 * Whether `cardImmersveConfig.monadConfig` is present. Presence routes new
 * Immersve onboarding to Monad while existing Base funding sources keep using
 * the top-level Base fields on the same flag.
 */
export function hasImmersveMonadConfig(
  config: ImmersveProgramConfig | null | undefined,
): boolean {
  return isNonEmptyObject(config?.monadConfig);
}

/**
 * Network used for SIWE signup and newly created funding sources.
 */
export function getImmersveSignupNetwork(
  config: ImmersveProgramConfig | null | undefined,
  fallback = 'base-sepolia',
): string {
  if (hasImmersveMonadConfig(config)) {
    return config?.monadConfig?.network ?? IMMERSVE_MONAD_NETWORK;
  }
  return config?.network ?? fallback;
}

/**
 * Funding channel used when creating / matching a funding source for signup.
 */
export function getImmersveSignupFundingChannelId(
  config: ImmersveProgramConfig | null | undefined,
): string | undefined {
  return resolveImmersveNetworkProgramValue(
    getImmersveSignupNetwork(config),
    'fundingChannelId',
    config,
  );
}

/**
 * Resolves a program value for a funding-source network.
 *
 * Monad values come from `monadConfig` when that block is present; Base /
 * Sepolia keep using the top-level `cardImmersveConfig` fields so UK prod
 * users continue to work alongside Monad onboarding.
 */
export function resolveImmersveNetworkProgramValue(
  network: string,
  key: ImmersveNetworkProgramKey,
  config: ImmersveProgramConfig | null | undefined,
): string | undefined {
  if (
    hasImmersveMonadConfig(config) &&
    network === (config?.monadConfig?.network ?? IMMERSVE_MONAD_NETWORK)
  ) {
    // Prefer monadConfig even when the field is '' so we do not fall back to
    // the Base top-level channel / program / spender.
    return config?.monadConfig?.[key];
  }
  return config?.[key];
}
