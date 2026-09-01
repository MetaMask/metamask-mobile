import type { ActivityListItem } from './types';

export function getLocalTransactionMetaId(
  item: ActivityListItem,
): string | undefined {
  return item.localTransactionMetaId;
}

export function getLocalTransactionInitialMetaId(
  item: ActivityListItem,
): string | undefined {
  return item.localTransactionInitialMetaId;
}

export function getLocalTransactionActionId(
  item: ActivityListItem,
): string | undefined {
  return item.localTransactionActionId;
}

export function isApiEvmTransactionItem(item: ActivityListItem): boolean {
  return item.apiEvmTransaction === true;
}

export function isLocalTransactionItem(item: ActivityListItem): boolean {
  return Boolean(item.localTransactionMetaId);
}

export function getKeyringTransactionId(
  item: ActivityListItem,
): string | undefined {
  return item.keyringTransactionId;
}

export function isKeyringTransactionItem(item: ActivityListItem): boolean {
  return Boolean(item.keyringTransactionId);
}

export function collectLocalTransactionLookupKeys(
  item: ActivityListItem,
): string[] {
  const keys = new Set<string>();
  if (item.hash) {
    keys.add(item.hash.toLowerCase());
  }
  if (item.localTransactionMetaId) {
    keys.add(item.localTransactionMetaId.toLowerCase());
  }
  if (item.localTransactionInitialMetaId) {
    keys.add(item.localTransactionInitialMetaId.toLowerCase());
  }
  for (const hash of item.localTransactionLookupHashes ?? []) {
    keys.add(hash.toLowerCase());
  }
  return [...keys];
}
