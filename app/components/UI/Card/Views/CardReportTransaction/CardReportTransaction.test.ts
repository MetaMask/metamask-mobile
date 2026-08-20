import { buildReportTransactionUrl } from './CardReportTransaction';
import {
  DEFAULT_IMMERSVE_REPORT_TRANSACTION_URL,
  IMMERSVE_REPORT_TRANSACTION_ID_PARAM,
} from '../../constants';

describe('buildReportTransactionUrl', () => {
  it('keeps existing query params and appends the transaction id', () => {
    const url = buildReportTransactionUrl(
      DEFAULT_IMMERSVE_REPORT_TRANSACTION_URL,
      'tx-123',
    );

    const parsed = new URL(url);
    expect(parsed.searchParams.get('ticket_form_id')).toBe('22905679582745');
    expect(parsed.searchParams.get(IMMERSVE_REPORT_TRANSACTION_ID_PARAM)).toBe(
      'tx-123',
    );
    expect(url).not.toContain('??');
  });

  it('builds distinct urls for different transaction ids', () => {
    const first = buildReportTransactionUrl(
      DEFAULT_IMMERSVE_REPORT_TRANSACTION_URL,
      'tx-a',
    );
    const second = buildReportTransactionUrl(
      DEFAULT_IMMERSVE_REPORT_TRANSACTION_URL,
      'tx-b',
    );

    expect(first).not.toBe(second);
  });
});
