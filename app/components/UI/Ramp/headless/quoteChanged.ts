import Logger from '../../../../util/Logger';
import { QuoteChangedError } from '../utils/transakQuoteParity';
import {
  dismissHeadlessFlow,
  type NavigationNode,
} from './headlessEntryNavigation';
import { failSession } from './sessionRegistry';

export function failHeadlessQuoteChanged(
  sessionId: string | undefined,
  navigation: NavigationNode | undefined,
  error: unknown,
): QuoteChangedError {
  const quoteChangedError =
    error instanceof QuoteChangedError
      ? error
      : new QuoteChangedError({ cause: String(error) });

  Logger.error(quoteChangedError, {
    message: 'Transak quote changed after authentication',
    code: quoteChangedError.code,
    ...quoteChangedError.details,
  });
  failSession(sessionId, quoteChangedError, 'QUOTE_CHANGED');
  dismissHeadlessFlow(navigation);

  return quoteChangedError;
}
