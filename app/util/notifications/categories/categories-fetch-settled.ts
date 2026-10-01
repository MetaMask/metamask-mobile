import { useSyncExternalStore } from 'react';

// Whether a categories fetch has finished (success or failure) this session.
// Lets the UI tell "not fetched yet" (skeleton) from "failed" (fallback).
let settled = false;
const listeners = new Set<() => void>();

export const markCategoriesFetchSettled = () => {
  settled = true;
  listeners.forEach((l) => l());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useCategoriesFetchSettled = () =>
  useSyncExternalStore(subscribe, () => settled);
