import { PredictErrorCode } from '../../errors';
import {
  parsePredictDepositOperation,
  parsePredictDepositStart,
  parsePredictOpenDeposits,
  parsePredictWithdrawPreview,
  parsePredictWithdrawReceipt,
} from './funding';
import addressRequestLost from './fixtures/funding-contract/address-request-lost.json';
import awaitingTransfer from './fixtures/funding-contract/awaiting-transfer.json';
import awaitingTransferPastPlan from './fixtures/funding-contract/awaiting-transfer-past-plan.json';
import cancelled from './fixtures/funding-contract/cancelled.json';
import credited from './fixtures/funding-contract/credited.json';
import needsReview from './fixtures/funding-contract/needs-review.json';
import openDeposits from './fixtures/funding-contract/open-deposits.json';
import requestingAddress from './fixtures/funding-contract/requesting-address.json';
import signRequest from './fixtures/funding-contract/sign-request.json';
import transferReported from './fixtures/funding-contract/transfer-reported.json';

const destination = {
  address: '0xcDe7aB4E0f4a8C7c0F8aE4bD9c1D2e3F4a5B6c7D',
  network: 'base',
  source: 'configured_demo',
};

const validFixedPreview = {
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  currency: 'USD',
  mode: 'fixed',
  requestedAmount: '5.00',
  destination,
  expiresAt: '2026-03-01T12:00:30.000Z',
};

const validSweepPreview = {
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  currency: 'USD',
  mode: 'sweep_all',
  destination,
  expiresAt: '2026-03-01T12:00:30.000Z',
};

const validProcessingReceipt = {
  operationId: '0f8a1c2b-3333-4444-8555-666677778888',
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  currency: 'USD',
  mode: 'fixed',
  status: 'processing',
  needsManualReview: false,
  requestedAmount: '5.00',
  withdrawnAmount: '5.00',
  venueTransferId: 'transfer-1',
  destination,
  createdAt: '2026-03-01T12:00:10.000Z',
  resolvedAt: null,
};

const validRejectedReceipt = {
  ...validProcessingReceipt,
  status: 'rejected',
  rejectionCode: 'insufficient_balance',
  withdrawnAmount: null,
  venueTransferId: null,
};

const expectInvalidResponse = (parse: () => unknown): void => {
  try {
    parse();
  } catch (error) {
    expect(error).toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    return;
  }
  throw new Error('Expected INVALID_RESPONSE.');
};

describe('parsePredictWithdrawPreview', () => {
  it('accepts a fixed quote with the server-resolved destination', () => {
    expect(parsePredictWithdrawPreview(validFixedPreview)).toEqual(
      validFixedPreview,
    );
  });

  it('accepts a sweep quote that omits requestedAmount', () => {
    const preview = parsePredictWithdrawPreview(validSweepPreview);
    expect(preview.mode).toBe('sweep_all');
    expect(preview).not.toHaveProperty('requestedAmount');
  });

  it('masks fields the contract does not name', () => {
    const preview = parsePredictWithdrawPreview({
      ...validFixedPreview,
      fee: '0.25',
      idempotencyKey: 'client-supplied',
    });
    expect(preview).not.toHaveProperty('fee');
    expect(preview).not.toHaveProperty('idempotencyKey');
  });

  it.each([
    [
      'a fixed quote without an amount',
      { ...validFixedPreview, requestedAmount: undefined },
    ],
    [
      'a sweep quote with an amount',
      { ...validSweepPreview, requestedAmount: '5.00' },
    ],
    [
      'a sweep quote with a null amount',
      { ...validSweepPreview, requestedAmount: null },
    ],
    [
      'an unknown destination source',
      {
        ...validFixedPreview,
        destination: { ...destination, source: 'client' },
      },
    ],
    [
      'an unsupported network',
      {
        ...validFixedPreview,
        destination: { ...destination, network: 'ethereum' },
      },
    ],
    [
      'a non-UTC expiry',
      { ...validFixedPreview, expiresAt: '2026-03-01T12:00:30+00:00' },
    ],
    [
      'a zero-padded amount',
      { ...validFixedPreview, requestedAmount: '05.00' },
    ],
    ['an unknown mode', { ...validFixedPreview, mode: 'partial' }],
    ['a missing destination', { ...validFixedPreview, destination: undefined }],
  ])('rejects %s', (_label, value) => {
    expectInvalidResponse(() => parsePredictWithdrawPreview(value));
  });
});

describe('parsePredictWithdrawReceipt', () => {
  it('accepts an in-progress receipt with null transfer fields', () => {
    const receipt = parsePredictWithdrawReceipt({
      ...validProcessingReceipt,
      withdrawnAmount: null,
      venueTransferId: null,
    });
    expect(receipt.withdrawnAmount).toBeNull();
    expect(receipt.venueTransferId).toBeNull();
  });

  it('accepts a rejected receipt that names its rejectionCode', () => {
    expect(parsePredictWithdrawReceipt(validRejectedReceipt)).toMatchObject({
      status: 'rejected',
      rejectionCode: 'insufficient_balance',
    });
  });

  it('keeps a manual-review receipt readable without inventing an outcome', () => {
    expect(
      parsePredictWithdrawReceipt({
        ...validProcessingReceipt,
        needsManualReview: true,
      }),
    ).toMatchObject({ needsManualReview: true, withdrawnAmount: '5.00' });
  });

  it.each([
    [
      'a rejected receipt without a rejectionCode',
      { ...validRejectedReceipt, rejectionCode: undefined },
    ],
    [
      'a settled receipt carrying a rejectionCode',
      {
        ...validProcessingReceipt,
        status: 'settled',
        rejectionCode: 'venue_rejected',
      },
    ],
    [
      'an unknown rejectionCode',
      { ...validRejectedReceipt, rejectionCode: 'unexpected_refusal' },
    ],
    ['an internal status', { ...validProcessingReceipt, status: 'submitting' }],
    [
      'a fixed receipt without requestedAmount',
      { ...validProcessingReceipt, requestedAmount: undefined },
    ],
    [
      'a sweep receipt with requestedAmount',
      {
        ...validProcessingReceipt,
        mode: 'sweep_all',
        requestedAmount: '5.00',
      },
    ],
    [
      'a missing needsManualReview',
      { ...validProcessingReceipt, needsManualReview: undefined },
    ],
    [
      'a receipt without a venueId match',
      { ...validProcessingReceipt, venueId: 'other-venue' },
    ],
    [
      'a receipt resolved by a non-UTC instant',
      { ...validProcessingReceipt, resolvedAt: '2026-03-01T12:00:20+00:00' },
    ],
  ])('rejects %s', (_label, value) => {
    expectInvalidResponse(() => parsePredictWithdrawReceipt(value));
  });
});

const INVALID_RESPONSE = 'The prediction service returned an invalid response.';

const clone = <TValue>(value: TValue): TValue =>
  JSON.parse(JSON.stringify(value)) as TValue;

/** The fixtures are predict-api's own projection of each stored status. */
const DEPOSIT_FIXTURES = [
  [
    'awaiting_transfer',
    awaitingTransfer,
    'awaiting_transfer',
    'wallet_transfer',
  ],
  [
    'awaiting_transfer past its plan',
    awaitingTransferPastPlan,
    'awaiting_transfer',
    'wait',
  ],
  ['requesting_address', requestingAddress, 'processing', 'wait'],
  ['transfer_reported', transferReported, 'processing', 'wait'],
  ['credited', credited, 'completed', 'done'],
  ['cancelled', cancelled, 'cancelled', null],
  ['failed (address_request_lost)', addressRequestLost, 'failed', null],
  ['needs_review', needsReview, 'under_review', 'review'],
] as const;

describe('parsePredictDepositOperation', () => {
  it.each(DEPOSIT_FIXTURES)(
    'parses the %s fixture',
    (_name, fixture, status, nextKind) => {
      const deposit = parsePredictDepositOperation(fixture);

      expect(deposit).toStrictEqual(fixture);
      expect(deposit.status).toBe(status);
      expect(deposit.next?.kind ?? null).toBe(nextKind);
    },
  );

  it('reads the Funding Plan from a deposit waiting for its transfer', () => {
    const deposit = parsePredictDepositOperation(awaitingTransfer);

    expect(deposit.next).toStrictEqual({
      kind: 'wallet_transfer',
      chainId: 84532,
      tokenContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount: '25.50',
      depositAddress: '0x3b0b371ae3cb08f272b87319684f6518b3b313a0',
      planExpiresAt: '2026-11-13T12:15:00.000Z',
    });
  });

  it('discards fields the contract does not name', () => {
    const input = {
      ...clone(awaitingTransfer),
      depositId: '01a1d11a-2101-76b2-9b0f-d477e21a75c9',
      failureCode: 'payment_failed',
      next: { ...clone(awaitingTransfer.next), calldata: '0xa9059cbb' },
    };

    expect(parsePredictDepositOperation(input)).toStrictEqual(awaitingTransfer);
  });

  it.each(['pending', 'credited', 'expired', 'needs_review', ''])(
    'rejects the unknown status %s',
    (status) => {
      const input = { ...clone(cancelled), status };

      expect(() => parsePredictDepositOperation(input)).toThrow(
        INVALID_RESPONSE,
      );
    },
  );

  it.each([
    ['without cents', '25'],
    ['with one decimal', '25.5'],
    ['with three decimals', '25.500'],
    ['negative', '-25.50'],
    ['zero-prefixed', '025.50'],
    ['in exponent notation', '2.55e1'],
    ['empty', ''],
    ['not a number', 'twenty'],
  ])('rejects an amount %s', (_name, amount) => {
    const input = { ...clone(cancelled), amount };

    expect(() => parsePredictDepositOperation(input)).toThrow(INVALID_RESPONSE);
  });

  it('rejects an amount that is not a string', () => {
    const input = { ...clone(cancelled), amount: 25.5 };

    expect(() => parsePredictDepositOperation(input)).toThrow(INVALID_RESPONSE);
  });

  it('rejects a malformed amount inside the Funding Plan', () => {
    const input = clone(awaitingTransfer);
    input.next.amount = '25.5';

    expect(() => parsePredictDepositOperation(input)).toThrow(INVALID_RESPONSE);
  });

  it.each(['sign_bytes', 'send_transaction', 'evm_calls', '', 'WAIT'])(
    'rejects the unknown step kind %s',
    (kind) => {
      const input = { ...clone(transferReported), next: { kind } };

      expect(() => parsePredictDepositOperation(input)).toThrow(
        INVALID_RESPONSE,
      );
    },
  );

  it('rejects a deposit whose step asks to be signed', () => {
    const input = {
      ...clone(requestingAddress),
      next: clone(signRequest.next),
    };

    expect(() => parsePredictDepositOperation(input)).toThrow(INVALID_RESPONSE);
  });

  it.each([
    ['a Funding Plan on a cancelled deposit', cancelled, awaitingTransfer.next],
    [
      'a Funding Plan on a processing deposit',
      transferReported,
      awaitingTransfer.next,
    ],
    ['done on a deposit under review', needsReview, { kind: 'done' }],
    ['no step on a deposit waiting for its transfer', awaitingTransfer, null],
    ['wait on a completed deposit', credited, { kind: 'wait' }],
    ['a step on a failed deposit', addressRequestLost, { kind: 'wait' }],
  ])('rejects %s', (_name, fixture, next) => {
    const input = { ...clone(fixture), next: clone(next) };

    expect(() => parsePredictDepositOperation(input)).toThrow(INVALID_RESPONSE);
  });

  it.each([
    ['chainId', 8453],
    ['tokenContract', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'],
    ['amount', '25.51'],
    ['depositAddress', '0x0000000000000000000000000000000000000001'],
    ['planExpiresAt', '2026-11-13T13:15:00.000Z'],
  ])(
    'rejects a Funding Plan whose %s differs from its deposit',
    (field, value) => {
      const input = clone(awaitingTransfer);
      input.next = { ...input.next, [field]: value };

      expect(() => parsePredictDepositOperation(input)).toThrow(
        INVALID_RESPONSE,
      );
    },
  );

  it('rejects a support reference that is not the operation ID', () => {
    const input = clone(needsReview);
    input.next.supportReference = 'another-reference';

    expect(() => parsePredictDepositOperation(input)).toThrow(INVALID_RESPONSE);
  });

  it.each([
    ['operationId', 'deposit-1'],
    ['chainId', 0],
    ['chainId', 84532.5],
    ['tokenContract', '0x036CbD53842c5426634e7929541eC2318f3dCF7'],
    ['depositAddress', 'base:0x3b0b371ae3cb08f272b87319684f6518b3b313a0'],
    ['txHash', '0x1234'],
    ['createdAt', '13 Nov 2026'],
    ['planExpiresAt', '2026-11-13T12:15:00+00:00'],
  ])('rejects a malformed %s', (field, value) => {
    const input = { ...clone(cancelled), [field]: value };

    expect(() => parsePredictDepositOperation(input)).toThrow(INVALID_RESPONSE);
  });

  it.each(['status', 'amount', 'next', 'txHash', 'createdAt'])(
    'rejects a deposit without %s',
    (field) => {
      const input: Record<string, unknown> = clone(cancelled);
      delete input[field];

      expect(() => parsePredictDepositOperation(input)).toThrow(
        INVALID_RESPONSE,
      );
    },
  );
});

describe('parsePredictOpenDeposits', () => {
  it('parses the open deposits fixture, oldest first', () => {
    const deposits = parsePredictOpenDeposits(openDeposits);

    expect(deposits).toStrictEqual(openDeposits.deposits);
    expect(deposits.map(({ status }) => status)).toStrictEqual([
      'under_review',
      'awaiting_transfer',
    ]);
  });

  it('parses an empty list', () => {
    expect(parsePredictOpenDeposits({ deposits: [] })).toStrictEqual([]);
  });

  it.each([
    ['a completed deposit', credited],
    ['a cancelled deposit', cancelled],
    ['a failed deposit', addressRequestLost],
  ])('rejects %s', (_name, fixture) => {
    expect(() =>
      parsePredictOpenDeposits({ deposits: [awaitingTransfer, fixture] }),
    ).toThrow(INVALID_RESPONSE);
  });

  it('rejects the same deposit twice', () => {
    expect(() =>
      parsePredictOpenDeposits({
        deposits: [awaitingTransfer, awaitingTransfer],
      }),
    ).toThrow(INVALID_RESPONSE);
  });

  it.each([[null], [[]], [{}], [{ deposits: {} }]])(
    'rejects the page %j',
    (value) => {
      expect(() => parsePredictOpenDeposits(value)).toThrow(INVALID_RESPONSE);
    },
  );
});

describe('parsePredictDepositStart', () => {
  it('parses the sign request fixture', () => {
    expect(parsePredictDepositStart(signRequest)).toStrictEqual({
      kind: 'sign_request',
      signRequest: {
        kind: 'sign_request',
        amountCents: 2550,
        clientOperationId: '6f1c7a52-8f3e-4d8b-9c1e-2a4b5c6d7e8f',
      },
    });
  });

  it('parses the stored deposit a repeated clientOperationId answers', () => {
    expect(parsePredictDepositStart(awaitingTransfer)).toStrictEqual({
      kind: 'deposit',
      deposit: awaitingTransfer,
    });
  });

  it.each([
    ['a zero amount', { amountCents: 0 }],
    ['a fractional amount', { amountCents: 25.5 }],
    ['an amount as a string', { amountCents: '2550' }],
    ['a clientOperationId that is not a UUID v4', { clientOperationId: '1' }],
  ])('rejects a sign request with %s', (_name, override) => {
    const input = { next: { ...clone(signRequest.next), ...override } };

    expect(() => parsePredictDepositStart(input)).toThrow(INVALID_RESPONSE);
  });

  it.each([[{ next: { kind: 'wait' } }], [{ next: null }], [{}], [null]])(
    'rejects the answer %j',
    (value) => {
      expect(() => parsePredictDepositStart(value)).toThrow(INVALID_RESPONSE);
    },
  );

  it('rejects a stored deposit with an unknown status', () => {
    const input = { ...clone(awaitingTransfer), status: 'expired' };

    expect(() => parsePredictDepositStart(input)).toThrow(INVALID_RESPONSE);
  });
});
