import addressRequestLost from '../../contracts/v1/fixtures/funding-contract/address-request-lost.json';
import cancelled from '../../contracts/v1/fixtures/funding-contract/cancelled.json';
import { KALSHI_VENUE_ID } from '../../adapters/remote/KalshiRemoteAdapter';
import type { PredictDepositOperation, PredictVenueId } from '../../types';
import {
  createDepositStatusJournal,
  type DepositJournalStorage,
} from './depositStatusJournal';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const createMemoryStorage = (): DepositJournalStorage => {
  const map = new Map<string, string>();
  return {
    getItem: async (key): Promise<string | null> => map.get(key) ?? null,
    setItem: async (key, value): Promise<void> => {
      map.set(key, value);
    },
    removeItem: async (key): Promise<void> => {
      map.delete(key);
    },
  };
};

describe('createDepositStatusJournal', () => {
  it('persists unresolved IDs and terminal notices scoped by identity and venue', async () => {
    const storage = createMemoryStorage();
    const journal = createDepositStatusJournal(storage);
    const failedDeposit = addressRequestLost as PredictDepositOperation;
    const cancelledDeposit = cancelled as PredictDepositOperation;

    await journal.save('profile-a', KALSHI_VENUE_ID, {
      unresolved: [{ operationId: 'op-1', lastStatus: 'processing' }],
      notices: [failedDeposit],
    });
    await journal.save('profile-b', KALSHI_VENUE_ID, {
      unresolved: [{ operationId: 'op-2', lastStatus: 'under_review' }],
      notices: [cancelledDeposit],
    });

    await expect(journal.load('profile-a', KALSHI_VENUE_ID)).resolves.toEqual({
      unresolved: [{ operationId: 'op-1', lastStatus: 'processing' }],
      notices: [failedDeposit],
    });
    await expect(journal.load('profile-b', KALSHI_VENUE_ID)).resolves.toEqual({
      unresolved: [{ operationId: 'op-2', lastStatus: 'under_review' }],
      notices: [cancelledDeposit],
    });
    await expect(
      journal.load('profile-a', 'polymarket' as PredictVenueId),
    ).resolves.toEqual({ unresolved: [], notices: [] });
  });

  it('quarantines malformed JSON and clears storage on clear()', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(
      'predict-next:deposit-status-journal:v1',
      '{bad-json',
    );
    const journal = createDepositStatusJournal(storage);

    await expect(journal.load('profile-a', KALSHI_VENUE_ID)).resolves.toEqual({
      unresolved: [],
      notices: [],
    });

    await journal.save('profile-a', KALSHI_VENUE_ID, {
      unresolved: [{ operationId: 'op-1', lastStatus: 'awaiting_transfer' }],
      notices: [],
    });
    await journal.clear();
    await expect(journal.load('profile-a', KALSHI_VENUE_ID)).resolves.toEqual({
      unresolved: [],
      notices: [],
    });
  });
});
