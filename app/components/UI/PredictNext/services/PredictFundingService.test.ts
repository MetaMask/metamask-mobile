import { PredictError, PredictErrorCode } from '../errors';
import type { VenueFundingAdapter } from '../adapters/types';
import type {
  PredictAmount,
  PredictDepositOperation,
  PredictHex,
  PredictVenueId,
} from '../types';
import awaitingTransfer from '../contracts/v1/fixtures/funding-contract/awaiting-transfer.json';
import cancelled from '../contracts/v1/fixtures/funding-contract/cancelled.json';
import credited from '../contracts/v1/fixtures/funding-contract/credited.json';
import needsReview from '../contracts/v1/fixtures/funding-contract/needs-review.json';
import transferReported from '../contracts/v1/fixtures/funding-contract/transfer-reported.json';
import {
  PredictFundingService,
  type PredictFundingServiceMessenger,
} from './PredictFundingService';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const venueId = 'kalshi' as PredictVenueId;
const APPROVAL = { kind: 'user-approved' as const };
const PARAMS = {
  amount: '25.50' as PredictAmount,
  clientOperationId: '6f1c7a52-8f3e-4d8b-9c1e-2a4b5c6d7e8f',
};
const OPERATION_ID = awaitingTransfer.operationId;
const deposit = (fixture: unknown): PredictDepositOperation =>
  fixture as PredictDepositOperation;

const createFunding = (): jest.Mocked<VenueFundingAdapter> => ({
  prepareDeposit: jest.fn().mockResolvedValue(deposit(awaitingTransfer)),
  getDeposit: jest.fn(),
  listOpenDeposits: jest.fn(),
  reportDepositTransfer: jest.fn(),
  cancelDeposit: jest.fn(),
});

const createMessenger = () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const messenger = {
    registerActionHandler: jest.fn(
      (type: string, handler: (...args: unknown[]) => unknown) => {
        handlers.set(type, handler);
      },
    ),
    unregisterActionHandler: jest.fn((type: string) => handlers.delete(type)),
    publish: jest.fn(),
    call: jest.fn().mockResolvedValue(undefined),
  };
  return {
    messenger: messenger as unknown as PredictFundingServiceMessenger,
    mock: messenger,
    handlers,
  };
};

describe('PredictFundingService', () => {
  let funding: jest.Mocked<VenueFundingAdapter>;
  let messenger: ReturnType<typeof createMessenger>;
  let service: PredictFundingService;

  beforeEach(() => {
    funding = createFunding();
    messenger = createMessenger();
    service = new PredictFundingService({
      messenger: messenger.messenger,
      funding,
      venueId,
    });
  });

  it('registers the deposit actions', () => {
    expect([...messenger.handlers.keys()]).toEqual([
      'PredictFundingService:prepareDeposit',
      'PredictFundingService:getDeposit',
      'PredictFundingService:listOpenDeposits',
      'PredictFundingService:reportDepositTransfer',
      'PredictFundingService:cancelDeposit',
    ]);
  });

  describe('prepareDeposit', () => {
    it('prepares the deposit with the explicit approval', async () => {
      await expect(
        service.prepareDeposit(venueId, PARAMS, APPROVAL),
      ).resolves.toStrictEqual(awaitingTransfer);

      expect(funding.prepareDeposit).toHaveBeenCalledWith(PARAMS, APPROVAL);
    });

    it('sends nothing without the approval', async () => {
      await expect(
        service.prepareDeposit(venueId, PARAMS),
      ).rejects.toMatchObject({
        code: PredictErrorCode.VENUE_SIGNING_REFUSED,
        metadata: { mutationRelay: 'not_relayed_this_invocation' },
      });
      expect(funding.prepareDeposit).not.toHaveBeenCalled();
    });

    it('shares one call per clientOperationId while it is in flight', async () => {
      let resolve: (value: PredictDepositOperation) => void = () => undefined;
      funding.prepareDeposit.mockReturnValue(
        new Promise((done) => {
          resolve = done;
        }),
      );

      const first = service.prepareDeposit(venueId, PARAMS, APPROVAL);
      const second = service.prepareDeposit(venueId, PARAMS, APPROVAL);
      resolve(deposit(awaitingTransfer));

      expect(second).toBe(first);
      await expect(first).resolves.toStrictEqual(awaitingTransfer);
      expect(funding.prepareDeposit).toHaveBeenCalledTimes(1);
    });

    it('runs again after the call in flight settles', async () => {
      funding.prepareDeposit.mockRejectedValueOnce(
        PredictError.from(PredictErrorCode.NETWORK_ERROR),
      );

      await expect(
        service.prepareDeposit(venueId, PARAMS, APPROVAL),
      ).rejects.toMatchObject({ code: PredictErrorCode.NETWORK_ERROR });
      await expect(
        service.prepareDeposit(venueId, PARAMS, APPROVAL),
      ).resolves.toStrictEqual(awaitingTransfer);
      expect(funding.prepareDeposit).toHaveBeenCalledTimes(2);
    });

    it('refuses another Venue', async () => {
      await expect(
        service.prepareDeposit(
          'polymarket' as PredictVenueId,
          PARAMS,
          APPROVAL,
        ),
      ).rejects.toMatchObject({ code: PredictErrorCode.UNSUPPORTED_VENUE });
      expect(funding.prepareDeposit).not.toHaveBeenCalled();
    });
  });

  it('passes the deposit reads and writes through to the adapter', async () => {
    const transfer = {
      txHash: transferReported.txHash as PredictHex,
      chainId: 84532,
    };
    funding.getDeposit.mockResolvedValue(deposit(awaitingTransfer));
    funding.listOpenDeposits.mockResolvedValue([deposit(awaitingTransfer)]);
    funding.reportDepositTransfer.mockResolvedValue(deposit(transferReported));
    funding.cancelDeposit.mockResolvedValue(deposit(cancelled));

    await expect(service.getDeposit(venueId, OPERATION_ID)).resolves.toBe(
      awaitingTransfer,
    );
    await expect(service.listOpenDeposits(venueId)).resolves.toStrictEqual([
      awaitingTransfer,
    ]);
    await expect(
      service.reportDepositTransfer(venueId, OPERATION_ID, transfer),
    ).resolves.toBe(transferReported);
    await expect(service.cancelDeposit(venueId, OPERATION_ID)).resolves.toBe(
      cancelled,
    );

    expect(funding.getDeposit).toHaveBeenCalledWith(OPERATION_ID);
    expect(funding.reportDepositTransfer).toHaveBeenCalledWith(
      OPERATION_ID,
      transfer,
    );
    expect(funding.cancelDeposit).toHaveBeenCalledWith(OPERATION_ID);
  });

  it.each([
    [
      'getDeposit',
      () => service.getDeposit('polymarket' as PredictVenueId, OPERATION_ID),
    ],
    [
      'listOpenDeposits',
      () => service.listOpenDeposits('polymarket' as PredictVenueId),
    ],
    [
      'cancelDeposit',
      () => service.cancelDeposit('polymarket' as PredictVenueId, OPERATION_ID),
    ],
  ])('%s refuses another Venue', async (_name, call) => {
    await expect(call()).rejects.toMatchObject({
      code: PredictErrorCode.UNSUPPORTED_VENUE,
    });
  });

  describe('depositResolved', () => {
    const resolvedEvents = () =>
      messenger.mock.publish.mock.calls.filter(
        ([type]) => type === 'PredictFundingService:depositResolved',
      );

    it('is published once when a watched deposit completes', async () => {
      await service.prepareDeposit(venueId, PARAMS, APPROVAL);
      funding.getDeposit.mockResolvedValue(deposit(transferReported));
      await service.getDeposit(venueId, OPERATION_ID);
      funding.getDeposit.mockResolvedValue(deposit(credited));

      await service.getDeposit(venueId, OPERATION_ID);
      await service.getDeposit(venueId, OPERATION_ID);

      expect(resolvedEvents()).toEqual([
        [
          'PredictFundingService:depositResolved',
          { venueId, deposit: credited },
        ],
      ]);
    });

    it('refreshes the Balance and Summary when a deposit completes', async () => {
      await service.prepareDeposit(venueId, PARAMS, APPROVAL);
      funding.getDeposit.mockResolvedValue(deposit(credited));

      await service.getDeposit(venueId, OPERATION_ID);

      expect(messenger.mock.call).toHaveBeenCalledWith(
        'PredictPortfolioService:invalidateQueries',
        { queryKey: ['PredictPortfolioService:getBalance', venueId] },
      );
      expect(messenger.mock.call).toHaveBeenCalledWith(
        'PredictPortfolioService:invalidateQueries',
        { queryKey: ['PredictPortfolioService:getPortfolioSummary', venueId] },
      );
    });

    it('does not fail the read when the refresh fails', async () => {
      messenger.mock.call.mockRejectedValue(new Error('no portfolio'));
      await service.prepareDeposit(venueId, PARAMS, APPROVAL);
      funding.getDeposit.mockResolvedValue(deposit(credited));

      await expect(service.getDeposit(venueId, OPERATION_ID)).resolves.toBe(
        credited,
      );
    });

    it('is published when the user cancels a waiting deposit', async () => {
      funding.listOpenDeposits.mockResolvedValue([deposit(awaitingTransfer)]);
      funding.cancelDeposit.mockResolvedValue(deposit(cancelled));
      await service.listOpenDeposits(venueId);

      await service.cancelDeposit(venueId, OPERATION_ID);

      expect(resolvedEvents()).toHaveLength(1);
      expect(messenger.mock.call).not.toHaveBeenCalled();
    });

    it('is published again when a cancelled deposit goes under review', async () => {
      funding.cancelDeposit.mockResolvedValue(deposit(cancelled));
      await service.prepareDeposit(venueId, PARAMS, APPROVAL);
      await service.cancelDeposit(venueId, OPERATION_ID);
      funding.getDeposit.mockResolvedValue(deposit(needsReview));

      await service.getDeposit(venueId, OPERATION_ID);

      expect(resolvedEvents().map(([, { deposit: d }]) => d.status)).toEqual([
        'cancelled',
        'under_review',
      ]);
    });

    it('is not published for a deposit first read already resolved', async () => {
      funding.getDeposit.mockResolvedValue(deposit(credited));

      await service.getDeposit(venueId, OPERATION_ID);
      await service.getDeposit(venueId, OPERATION_ID);

      expect(resolvedEvents()).toEqual([]);
    });

    it('forgets every deposit on clearState', async () => {
      await service.prepareDeposit(venueId, PARAMS, APPROVAL);
      service.clearState();
      funding.getDeposit.mockResolvedValue(deposit(credited));

      await service.getDeposit(venueId, OPERATION_ID);

      expect(resolvedEvents()).toEqual([]);
    });

    it('does not record an answer that arrives after clearState', async () => {
      let resolve: (value: PredictDepositOperation) => void = () => undefined;
      funding.prepareDeposit.mockReturnValue(
        new Promise((done) => {
          resolve = done;
        }),
      );
      const prepared = service.prepareDeposit(venueId, PARAMS, APPROVAL);
      service.clearState();
      resolve(deposit(awaitingTransfer));
      await prepared;
      funding.getDeposit.mockResolvedValue(deposit(credited));

      await service.getDeposit(venueId, OPERATION_ID);

      expect(resolvedEvents()).toEqual([]);
    });

    it('does not share a call in flight across clearState', async () => {
      funding.prepareDeposit.mockReturnValue(new Promise(() => undefined));
      const before = service.prepareDeposit(venueId, PARAMS, APPROVAL);
      service.clearState();

      const after = service.prepareDeposit(venueId, PARAMS, APPROVAL);

      expect(after).not.toBe(before);
      expect(funding.prepareDeposit).toHaveBeenCalledTimes(2);
    });
  });

  it('unregisters its actions on destroy', () => {
    service.destroy();

    expect(messenger.handlers.size).toBe(0);
  });
});
