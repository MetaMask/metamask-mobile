import type { Provider, QuotesResponse } from '@metamask/ramps-controller';

const BLOCKED_RAMP_PROVIDER_KEYS = new Set(['blockchain', 'blockchaincom']);

const normalizeProviderKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^\/?providers\//u, '')
    .replace(/[^a-z0-9]/gu, '');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isBlockedProviderValue = (value: unknown): boolean =>
  typeof value === 'string' &&
  BLOCKED_RAMP_PROVIDER_KEYS.has(normalizeProviderKey(value));

export const isBlockedRampProvider = (provider: unknown): boolean => {
  if (isBlockedProviderValue(provider)) {
    return true;
  }

  if (!isRecord(provider)) {
    return false;
  }

  return (
    isBlockedProviderValue(provider.id) || isBlockedProviderValue(provider.name)
  );
};

export const filterBlockedRampProviders = <T extends Pick<Provider, 'id'>>(
  providers: T[],
): T[] => providers.filter((provider) => !isBlockedRampProvider(provider));

export const filterBlockedRampProviderIds = <T extends string>(
  providerIds: T[] | undefined,
): T[] | undefined =>
  providerIds?.filter((providerId) => !isBlockedRampProvider(providerId));

const isBlockedRampProviderItem = (item: unknown): boolean => {
  if (!isRecord(item)) {
    return false;
  }

  return (
    isBlockedRampProvider(item.provider) ||
    isBlockedRampProvider(item.providerInfo) ||
    isBlockedProviderValue(item.providerId)
  );
};

export const filterBlockedRampProviderItems = <T>(
  items: T[] | undefined,
): T[] | undefined => items?.filter((item) => !isBlockedRampProviderItem(item));

const isBlockedCustomAction = (customAction: unknown): boolean => {
  if (!isRecord(customAction)) {
    return false;
  }

  const buy = isRecord(customAction.buy) ? customAction.buy : undefined;
  const sell = isRecord(customAction.sell) ? customAction.sell : undefined;

  return (
    isBlockedRampProvider(buy?.provider) ||
    isBlockedRampProvider(sell?.provider) ||
    isBlockedProviderValue(buy?.providerId) ||
    isBlockedProviderValue(sell?.providerId)
  );
};

export const filterBlockedRampProviderCustomActions = <T>(
  customActions: T[] | undefined,
): T[] | undefined =>
  customActions?.filter((customAction) => !isBlockedCustomAction(customAction));

export const filterBlockedRampProviderSortedMetadata = <T>(
  sorted: T[] | undefined,
): T[] | undefined =>
  sorted?.map((sortMetadata) => {
    if (!isRecord(sortMetadata) || !Array.isArray(sortMetadata.ids)) {
      return sortMetadata;
    }

    return {
      ...sortMetadata,
      ids: sortMetadata.ids.filter((id) => !isBlockedProviderValue(id)),
    } as T;
  });

export const filterBlockedRampProvidersFromQuotesResponse = <
  T extends QuotesResponse,
>(
  response: T,
): T =>
  ({
    ...response,
    success: filterBlockedRampProviderItems(response.success),
    error: filterBlockedRampProviderItems(response.error),
    customActions: filterBlockedRampProviderCustomActions(
      response.customActions,
    ),
    sorted: filterBlockedRampProviderSortedMetadata(response.sorted),
  }) as T;
