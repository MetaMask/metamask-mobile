import { useSyncExternalStore } from 'react';
import {
  getFormattingLocale,
  subscribeToLocaleChanges,
} from '../../util/locale';

// App language combined with the device region, e.g. "en-DE".
export function useFormattingLocale() {
  return useSyncExternalStore(subscribeToLocaleChanges, getFormattingLocale);
}
