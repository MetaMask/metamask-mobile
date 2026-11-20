import { PredictErrorCode } from '../../errors';
import type { PredictAmount, PredictHex } from '../../types';
import awaitingTransfer from '../../contracts/v1/fixtures/funding-contract/awaiting-transfer.json';
import cancelled from '../../contracts/v1/fixtures/funding-contract/cancelled.json';
import openDeposits from '../../contracts/v1/fixtures/funding-contract/open-deposits.json';
import signRequest from '../../contracts/v1/fixtures/funding-contract/sign-request.json';
import transferReported from '../../contracts/v1/fixtures/funding-contract/transfer-reported.json';
import { KalshiRemoteAdapter } from './KalshiRemoteAdapter';
import {
  PredictHttpError,
  PredictRequestNotSentError,
  type PredictApiReadTransport,
} from './PredictApiReadClient';

const USER_APPROVAL = { kind: 'user-approved' as const };
const OPERATION_ID = awaitingTransfer.operationId;
const CLIENT_OPERATION_ID = signRequest.next.clientOperationId;
const DEPOSIT = {
  amount: '25.50' as PredictAmount,
  clientOperationId: CLIENT_OPERATION_ID,
};
const TX_HASH = transferReported.txHash as PredictHex;

const createClient = (): jest.Mocked<PredictApiReadTransport> => ({
  fetchVenueStatus: jest.fn(),
  fetchVenueCatalog: jest.fn(),
  fetchBalance: jest.fn(),
  fetchPositions: jest.fn(),
  fetchActivity: jest.fn(),
  fetchPortfolioSummary: jest.fn(),
  fetchFeed: jest.fn(),
  fetchEvent: jest.fn(),
  fetchMarketHistory: jest.fn(),
  searchEvents: jest.fn(),
  fetchOrderPreview: jest.fn(),
  commitOrder: jest.fn(),
  observeOrder: jest.fn(),
  listUnresolvedOrders: jest.fn(),
  startDeposit: jest.fn(),
  createDeposit: jest.fn(),
  getDeposit: jest.fn(),
  listOpenDeposits: jest.fn(),
  reportDepositTransfer: jest.fn(),
  cancelDeposit: jest.fn(),
  fetchWithdrawPreview: jest.fn(),
  commitWithdraw: jest.fn(),
  observeWithdraw: jest.fn(),
});

describe('KalshiRemoteAdapter funding', () => {
  let client: jest.Mocked<PredictApiReadTransport>;
  let adapter: KalshiRemoteAdapter;
  let approvalGeneration: number | undefined;

  beforeEach(() => {
    approvalGeneration = 4;
    client = createClient();
    client.startDeposit.mockResolvedValue(signRequest);
    client.createDeposit.mockResolvedValue(awaitingTransfer);
    adapter = new KalshiRemoteAdapter(client, {
      getApprovalGeneration: () => approvalGeneration,
    });
  });

  describe('prepareDeposit', () => {
    it('asks what to sign, then signs funding.deposit from the entered amount', async () => {
      const deposit = await adapter.funding.prepareDeposit(
        DEPOSIT,
        USER_APPROVAL,
      );

      expect(deposit).toStrictEqual(awaitingTransfer);
      expect(client.startDeposit).toHaveBeenCalledWith(
        'kalshi',
        DEPOSIT,
        undefined,
      );
      expect(client.createDeposit).toHaveBeenCalledWith(
        'kalshi',
        DEPOSIT,
        undefined,
        {
          inputs: {
            amountCents: 2550,
            networks: ['base'],
            clientOperationId: CLIENT_OPERATION_ID,
          },
          approvalGeneration: 4,
          confirmed: true,
        },
      );
    });

    it('answers the stored deposit of a repeated clientOperationId without signing', async () => {
      client.startDeposit.mockResolvedValue(transferReported);

      const deposit = await adapter.funding.prepareDeposit(
        DEPOSIT,
        USER_APPROVAL,
      );

      expect(deposit).toStrictEqual(transferReported);
      expect(client.createDeposit).not.toHaveBeenCalled();
    });

    it.each([
      ['amount', { amountCents: 2551 }],
      [
        'clientOperationId',
        { clientOperationId: '0b5b8a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b' },
      ],
    ])(
      'signs nothing when the sign request names another %s',
      async (_field, override) => {
        client.startDeposit.mockResolvedValue({
          next: { ...signRequest.next, ...override },
        });

        await expect(
          adapter.funding.prepareDeposit(DEPOSIT, USER_APPROVAL),
        ).rejects.toMatchObject({
          code: PredictErrorCode.INVALID_RESPONSE,
          metadata: {
            phase: 'commit',
            mutationRelay: 'not_relayed_this_invocation',
          },
        });
        expect(client.createDeposit).not.toHaveBeenCalled();
      },
    );

    it('refuses a created deposit for another amount', async () => {
      client.createDeposit.mockResolvedValue({
        ...awaitingTransfer,
        amount: '25.51',
        next: { ...awaitingTransfer.next, amount: '25.51' },
      });

      await expect(
        adapter.funding.prepareDeposit(DEPOSIT, USER_APPROVAL),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    });

    it('refuses a signed answer that is still a sign request', async () => {
      client.createDeposit.mockResolvedValue(signRequest);

      await expect(
        adapter.funding.prepareDeposit(DEPOSIT, USER_APPROVAL),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    });

    it.each([
      ['under one dollar', '0.99'],
      ['with fractions of a cent', '25.505'],
      ['negative', '-25'],
      ['not a number', 'all'],
    ])('sends nothing for an amount %s', async (_name, amount) => {
      await expect(
        adapter.funding.prepareDeposit(
          { ...DEPOSIT, amount: amount as PredictAmount },
          USER_APPROVAL,
        ),
      ).rejects.toMatchObject({
        code: PredictErrorCode.DEPOSIT_AMOUNT_REJECTED,
      });
      expect(client.startDeposit).not.toHaveBeenCalled();
    });

    it('sends nothing for a clientOperationId that is not a UUID v4', async () => {
      await expect(
        adapter.funding.prepareDeposit(
          { ...DEPOSIT, clientOperationId: 'deposit-1' },
          USER_APPROVAL,
        ),
      ).rejects.toMatchObject({
        code: PredictErrorCode.DEPOSIT_AMOUNT_REJECTED,
      });
      expect(client.startDeposit).not.toHaveBeenCalled();
    });

    it('sends nothing without an explicit user approval', async () => {
      await expect(
        adapter.funding.prepareDeposit(DEPOSIT, {
          kind: 'automatic',
        } as unknown as typeof USER_APPROVAL),
      ).rejects.toMatchObject({
        code: PredictErrorCode.VENUE_SIGNING_REFUSED,
      });
      expect(client.startDeposit).not.toHaveBeenCalled();
    });

    it('sends nothing while signing has no approval generation', async () => {
      approvalGeneration = undefined;

      await expect(
        adapter.funding.prepareDeposit(DEPOSIT, USER_APPROVAL),
      ).rejects.toMatchObject({ code: PredictErrorCode.UNAUTHENTICATED });
      expect(client.startDeposit).not.toHaveBeenCalled();
    });

    it('copies the parameters before the first network call', async () => {
      const params = { ...DEPOSIT };
      client.startDeposit.mockImplementation(async () => {
        params.amount = '99.00' as PredictAmount;
        return signRequest;
      });

      await adapter.funding.prepareDeposit(params, USER_APPROVAL);

      expect(client.createDeposit).toHaveBeenCalledWith(
        'kalshi',
        DEPOSIT,
        undefined,
        expect.objectContaining({
          inputs: expect.objectContaining({ amountCents: 2550 }),
        }),
      );
    });

    it('reports an error before signing as not a mutation', async () => {
      client.startDeposit.mockRejectedValue(
        new PredictHttpError(409, 'deposit_in_progress'),
      );

      await expect(
        adapter.funding.prepareDeposit(DEPOSIT, USER_APPROVAL),
      ).rejects.toMatchObject({
        code: PredictErrorCode.DEPOSIT_IN_PROGRESS,
        metadata: { phase: 'preview', mutationRelay: 'not_a_mutation' },
      });
      expect(client.createDeposit).not.toHaveBeenCalled();
    });

    it('keeps the operation id a deposit refusal names', async () => {
      client.startDeposit.mockRejectedValue(
        new PredictHttpError(409, 'deposit_in_progress', {
          operationId: 'op-9',
        }),
      );

      await expect(
        adapter.funding.prepareDeposit(DEPOSIT, USER_APPROVAL),
      ).rejects.toMatchObject({
        code: PredictErrorCode.DEPOSIT_IN_PROGRESS,
        metadata: { depositOperationId: 'op-9' },
      });
    });

    it.each([
      [
        409,
        'deposit_in_progress',
        PredictErrorCode.DEPOSIT_IN_PROGRESS,
        'not_relayed_this_invocation',
      ],
      [
        403,
        'venue_preview_mismatch',
        PredictErrorCode.DEPOSIT_MISMATCH,
        'not_relayed_this_invocation',
      ],
      [
        409,
        'client_operation_id_conflict',
        PredictErrorCode.DEPOSIT_MISMATCH,
        'not_relayed_this_invocation',
      ],
      [
        422,
        'amount_rejected',
        PredictErrorCode.DEPOSIT_AMOUNT_REJECTED,
        'unknown',
      ],
      [422, 'deposit_rejected', PredictErrorCode.DEPOSIT_FAILED, 'unknown'],
      [
        502,
        'deposit_address_invalid',
        PredictErrorCode.DEPOSIT_FAILED,
        'unknown',
      ],
      [503, 'address_request_lost', PredictErrorCode.DEPOSIT_FAILED, 'unknown'],
      [
        409,
        'venue_profile_update_required',
        PredictErrorCode.APP_UPDATE_REQUIRED,
        'not_relayed_this_invocation',
      ],
      [
        403,
        'venue_authorization_invalid',
        PredictErrorCode.UNAUTHENTICATED,
        'not_relayed_this_invocation',
      ],
      [
        403,
        'venue_account_not_enabled',
        PredictErrorCode.VENUE_ACCOUNT_NOT_ENABLED,
        'unknown',
      ],
      [502, 'venue_auth_rejected', PredictErrorCode.UNAUTHENTICATED, 'unknown'],
    ] as const)(
      'maps %s %s from the signed call',
      async (status, code, expected, mutationRelay) => {
        client.createDeposit.mockRejectedValue(
          new PredictHttpError(status, code),
        );

        await expect(
          adapter.funding.prepareDeposit(DEPOSIT, USER_APPROVAL),
        ).rejects.toMatchObject({
          code: expected,
          metadata: {
            status,
            bodyCode: code,
            phase: 'commit',
            mutationRelay,
            operationOutcome: 'unknown',
          },
        });
      },
    );

    it('keeps an unsigned refusal unsent', async () => {
      client.createDeposit.mockRejectedValue(
        new PredictRequestNotSentError('venue_signing_refused'),
      );

      await expect(
        adapter.funding.prepareDeposit(DEPOSIT, USER_APPROVAL),
      ).rejects.toMatchObject({
        code: PredictErrorCode.VENUE_SIGNING_REFUSED,
        metadata: {
          requestSent: false,
          mutationRelay: 'not_relayed_this_invocation',
        },
      });
    });

    it('refuses an unparseable deposit', async () => {
      client.createDeposit.mockResolvedValue({
        ...awaitingTransfer,
        status: 'expired',
      });

      await expect(
        adapter.funding.prepareDeposit(DEPOSIT, USER_APPROVAL),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    });
  });

  describe('getDeposit', () => {
    it('reads one deposit by operation ID', async () => {
      client.getDeposit.mockResolvedValue(awaitingTransfer);

      const deposit = await adapter.funding.getDeposit(OPERATION_ID);

      expect(deposit).toStrictEqual(awaitingTransfer);
      expect(client.getDeposit).toHaveBeenCalledWith(
        'kalshi',
        OPERATION_ID,
        undefined,
      );
    });

    it('refuses another deposit than the one asked for', async () => {
      client.getDeposit.mockResolvedValue({
        ...cancelled,
        operationId: '019a7c3e-0000-7000-8000-000000000002',
      });

      await expect(
        adapter.funding.getDeposit(OPERATION_ID),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    });

    it('maps operation_not_found to a missing deposit', async () => {
      client.getDeposit.mockRejectedValue(
        new PredictHttpError(404, 'operation_not_found'),
      );

      await expect(
        adapter.funding.getDeposit(OPERATION_ID),
      ).rejects.toMatchObject({
        code: PredictErrorCode.DEPOSIT_NOT_FOUND,
        metadata: { phase: 'observe', mutationRelay: 'not_a_mutation' },
      });
    });

    it('reads nothing for an ID that is not a UUID', async () => {
      await expect(
        adapter.funding.getDeposit('../orders'),
      ).rejects.toMatchObject({ code: PredictErrorCode.DEPOSIT_NOT_FOUND });
      expect(client.getDeposit).not.toHaveBeenCalled();
    });
  });

  describe('listOpenDeposits', () => {
    it('lists the open deposits, oldest first', async () => {
      client.listOpenDeposits.mockResolvedValue(openDeposits);

      const deposits = await adapter.funding.listOpenDeposits();

      expect(deposits).toStrictEqual(openDeposits.deposits);
      expect(client.listOpenDeposits).toHaveBeenCalledWith('kalshi', undefined);
    });

    it('refuses a list that holds a closed deposit', async () => {
      client.listOpenDeposits.mockResolvedValue({ deposits: [cancelled] });

      await expect(adapter.funding.listOpenDeposits()).rejects.toMatchObject({
        code: PredictErrorCode.INVALID_RESPONSE,
      });
    });

    it('maps an unauthenticated read', async () => {
      client.listOpenDeposits.mockRejectedValue(new PredictHttpError(401));

      await expect(adapter.funding.listOpenDeposits()).rejects.toMatchObject({
        code: PredictErrorCode.UNAUTHENTICATED,
      });
    });
  });

  describe('reportDepositTransfer', () => {
    const transfer = { txHash: TX_HASH, chainId: 84532 };

    it('reports the transfer hash and chain', async () => {
      client.reportDepositTransfer.mockResolvedValue(transferReported);

      const deposit = await adapter.funding.reportDepositTransfer(
        OPERATION_ID,
        transfer,
      );

      expect(deposit).toStrictEqual(transferReported);
      expect(client.reportDepositTransfer).toHaveBeenCalledWith(
        'kalshi',
        OPERATION_ID,
        transfer,
        undefined,
      );
    });

    it.each([
      ['transfer_chain_mismatch', 400],
      ['transfer_hash_invalid', 400],
      ['transfer_hash_mismatch', 409],
      ['transfer_hash_reused', 409],
      ['transfer_not_expected', 409],
    ] as const)(
      'maps %s to a refused transfer that was not relayed',
      async (code, status) => {
        client.reportDepositTransfer.mockRejectedValue(
          new PredictHttpError(status, code),
        );

        await expect(
          adapter.funding.reportDepositTransfer(OPERATION_ID, transfer),
        ).rejects.toMatchObject({
          code: PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH,
          metadata: {
            bodyCode: code,
            phase: 'commit',
            mutationRelay: 'not_relayed_this_invocation',
          },
        });
      },
    );

    it('maps operation_not_found to a report that was not relayed', async () => {
      client.reportDepositTransfer.mockRejectedValue(
        new PredictHttpError(404, 'operation_not_found'),
      );

      await expect(
        adapter.funding.reportDepositTransfer(OPERATION_ID, transfer),
      ).rejects.toMatchObject({
        code: PredictErrorCode.DEPOSIT_NOT_FOUND,
        metadata: {
          bodyCode: 'operation_not_found',
          phase: 'commit',
          mutationRelay: 'not_relayed_this_invocation',
          operationOutcome: 'unknown',
        },
      });
    });

    it('reads the transfer codes on the transfer route only', async () => {
      client.cancelDeposit.mockRejectedValue(
        new PredictHttpError(409, 'transfer_not_expected'),
      );

      await expect(
        adapter.funding.cancelDeposit(OPERATION_ID),
      ).rejects.toMatchObject({
        code: PredictErrorCode.INVALID_RESPONSE,
        metadata: { mutationRelay: 'unknown' },
      });
    });

    it.each([
      ['a short hash', { txHash: '0x1234' as PredictHex }],
      ['a zero chain', { chainId: 0 }],
      ['a fractional chain', { chainId: 8453.5 }],
    ])('sends nothing for %s', async (_name, override) => {
      await expect(
        adapter.funding.reportDepositTransfer(OPERATION_ID, {
          ...transfer,
          ...override,
        }),
      ).rejects.toMatchObject({
        code: PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH,
        metadata: { mutationRelay: 'not_relayed_this_invocation' },
      });
      expect(client.reportDepositTransfer).not.toHaveBeenCalled();
    });

    it('refuses an answer for another deposit', async () => {
      client.reportDepositTransfer.mockResolvedValue({
        ...transferReported,
        operationId: '019a7c3e-0000-7000-8000-000000000002',
      });

      await expect(
        adapter.funding.reportDepositTransfer(OPERATION_ID, transfer),
      ).rejects.toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    });
  });

  describe('cancelDeposit', () => {
    it('cancels a deposit and answers it', async () => {
      client.cancelDeposit.mockResolvedValue(cancelled);

      const deposit = await adapter.funding.cancelDeposit(OPERATION_ID);

      expect(deposit).toStrictEqual(cancelled);
      expect(client.cancelDeposit).toHaveBeenCalledWith(
        'kalshi',
        OPERATION_ID,
        undefined,
      );
    });

    it.each([
      [
        409,
        'deposit_not_cancellable',
        PredictErrorCode.DEPOSIT_NOT_CANCELLABLE,
        'not_relayed_this_invocation',
      ],
      // Cancel looks the deposit up before it changes it, so this call
      // stored nothing. Absence still says nothing about an earlier call.
      [
        404,
        'operation_not_found',
        PredictErrorCode.DEPOSIT_NOT_FOUND,
        'not_relayed_this_invocation',
      ],
    ] as const)('maps %s %s', async (status, code, expected, mutationRelay) => {
      client.cancelDeposit.mockRejectedValue(
        new PredictHttpError(status, code),
      );

      await expect(
        adapter.funding.cancelDeposit(OPERATION_ID),
      ).rejects.toMatchObject({
        code: expected,
        metadata: {
          phase: 'commit',
          mutationRelay,
          operationOutcome: 'unknown',
        },
      });
    });
  });
});
