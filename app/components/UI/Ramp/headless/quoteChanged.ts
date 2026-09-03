import type { QuoteChangedError } from '../utils/transakQuoteParity';
import { dismissHeadlessFlow } from './headlessEntryNavigation';
import { failSession } from './sessionRegistry';

interface NavigationLike {
  getParent?: () => NavigationLike | undefined;
  goBack?: () => void;
  pop?: () => void;
}

export function failHeadlessQuoteChanged(
  sessionId: string,
  navigation: NavigationLike,
  error: QuoteChangedError,
): void {
  failSession(sessionId, error, 'QUOTE_CHANGED');
  dismissHeadlessFlow(navigation);
}
