import type { PredictAmount, PredictHex, PredictVenueId } from '../../types';
import awaitingTransfer from '../../contracts/v1/fixtures/funding-contract/awaiting-transfer.json';
import cancelled from '../../contracts/v1/fixtures/funding-contract/cancelled.json';
import openDeposits from '../../contracts/v1/fixtures/funding-contract/open-deposits.json';
import signRequest from '../../contracts/v1/fixtures/funding-contract/sign-request.json';
import transferReported from '../../contracts/v1/fixtures/funding-contract/transfer-reported.json';
import {
  PredictApiReadClient,
  PredictHttpError,
  PredictRequestNotSentError,
} from './PredictApiReadClient';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const venueId = 'kalshi' as PredictVenueId;
const BASE = 'https://predict.example/api/v1/venues/kalshi/deposits';
const OPERATION_ID = awaitingTransfer.operationId;
const DEPOSIT = {
  amount: '25.50' as PredictAmount,
  clientOperationId: signRequest.next.clientOperationId,
};
const SIGNED_BODY = '{"amount_cents":2550,"networks":["base"]}';
const SIGNED = {
  header: { name: 'Venue-Authorization', value: 'envelope' },
  body: SIGNED_BODY,
  idempotencyKey: DEPOSIT.clientOperationId,
};
const SIGNING = {
  inputs: {
    amountCents: 2550,
    networks: ['base'],
    clientOperationId: DEPOSIT.clientOperationId,
  },
  approvalGeneration: 1,
  confirmed: true,
};

const response = (status: number, json: unknown): Response => {
  const make = (): Response =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: jest.fn().mockResolvedValue(json),
      clone: () => make(),
    }) as unknown as Response;
  return make();
};

const requestAt = (
  fetchMock: jest.MockedFunction<typeof fetch>,
  index = 0,
): { url: string; init: RequestInit; headers: Record<string, string> } => {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
};

describe('PredictApiReadClient deposit routes', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let signOperation: jest.Mock;
  let invalidateSigningSession: jest.Mock;
  let client: PredictApiReadClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    signOperation = jest.fn().mockResolvedValue(SIGNED);
    invalidateSigningSession = jest.fn();
    client = new PredictApiReadClient({
      baseUrl: 'https://predict.example/api/',
      clientVersion: '7.0.0',
      fetch: fetchMock,
      getBearerToken: async () => 'secret-token',
      signOperation,
      invalidateSigningSession,
    });
  });

  describe('startDeposit', () => {
    it('posts the amount and key bearer-only, with no signature', async () => {
      fetchMock.mockResolvedValue(response(200, signRequest));

      await expect(client.startDeposit(venueId, DEPOSIT)).resolves.toEqual(
        signRequest,
      );

      const { url, init, headers } = requestAt(fetchMock);
      expect(url).toBe(BASE);
      expect(init.method).toBe('POST');
      expect(init.body).toBe(
        `{"amount":"25.50","clientOperationId":"${DEPOSIT.clientOperationId}"}`,
      );
      expect(headers.Authorization).toBe('Bearer secret-token');
      expect(headers).not.toHaveProperty('Venue-Authorization');
      expect(signOperation).not.toHaveBeenCalled();
    });

    it('sends only the contract fields', async () => {
      fetchMock.mockResolvedValue(response(200, signRequest));

      await client.startDeposit(venueId, {
        ...DEPOSIT,
        signedBody: 'smuggled',
      } as typeof DEPOSIT);

      expect(JSON.parse(requestAt(fetchMock).init.body as string)).toEqual(
        DEPOSIT,
      );
    });
  });

  describe('createDeposit', () => {
    it('signs funding.deposit and relays the signed bytes as signedBody', async () => {
      fetchMock.mockResolvedValue(response(200, awaitingTransfer));

      await expect(
        client.createDeposit(venueId, DEPOSIT, undefined, SIGNING),
      ).resolves.toEqual(awaitingTransfer);

      expect(signOperation).toHaveBeenCalledWith('funding.deposit', SIGNING);
      const { url, init, headers } = requestAt(fetchMock);
      expect(url).toBe(BASE);
      expect(headers['Venue-Authorization']).toBe('envelope');
      expect(headers['Content-Type']).toBe('application/json');
      expect(init.body).toBe(
        JSON.stringify({
          amount: '25.50',
          clientOperationId: DEPOSIT.clientOperationId,
          signedBody: SIGNED_BODY,
        }),
      );
      // The exact signed string survives the outer JSON.
      expect(JSON.parse(init.body as string).signedBody).toBe(SIGNED_BODY);
    });

    it('signs again once, without a new confirmation, on venue_signature_expired', async () => {
      fetchMock
        .mockResolvedValueOnce(
          response(409, { code: 'venue_signature_expired' }),
        )
        .mockResolvedValueOnce(response(200, awaitingTransfer));

      await expect(
        client.createDeposit(venueId, DEPOSIT, undefined, SIGNING),
      ).resolves.toEqual(awaitingTransfer);

      expect(signOperation).toHaveBeenCalledTimes(2);
      expect(signOperation).toHaveBeenLastCalledWith('funding.deposit', {
        ...SIGNING,
        confirmed: false,
      });
      expect(invalidateSigningSession).not.toHaveBeenCalled();
    });

    it('surfaces a deposit error with its code', async () => {
      fetchMock.mockResolvedValue(
        response(409, { code: 'deposit_in_progress', deposit: cancelled }),
      );

      const failed = client.createDeposit(venueId, DEPOSIT, undefined, SIGNING);

      await expect(failed).rejects.toBeInstanceOf(PredictHttpError);
      await expect(failed).rejects.toMatchObject({
        status: 409,
        bodyCode: 'deposit_in_progress',
        deposit: cancelled,
      });
    });

    it('sends nothing without signing inputs', async () => {
      const failed = client.createDeposit(venueId, DEPOSIT);

      await expect(failed).rejects.toBeInstanceOf(PredictRequestNotSentError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends nothing when the signer is unavailable', async () => {
      signOperation.mockResolvedValue(undefined);

      await expect(
        client.createDeposit(venueId, DEPOSIT, undefined, SIGNING),
      ).rejects.toMatchObject({
        bodyCode: 'venue_signing_unavailable',
        requestSent: false,
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('reads one deposit by operation ID', async () => {
    fetchMock.mockResolvedValue(response(200, awaitingTransfer));

    await expect(client.getDeposit(venueId, OPERATION_ID)).resolves.toEqual(
      awaitingTransfer,
    );

    const { url, init, headers } = requestAt(fetchMock);
    expect(url).toBe(`${BASE}/${OPERATION_ID}`);
    expect(init.method).toBe('GET');
    expect(headers).not.toHaveProperty('Venue-Authorization');
  });

  it('lists the open deposits', async () => {
    fetchMock.mockResolvedValue(response(200, openDeposits));

    await expect(client.listOpenDeposits(venueId)).resolves.toEqual(
      openDeposits,
    );

    expect(requestAt(fetchMock).url).toBe(`${BASE}?state=open`);
  });

  it('reports the transfer hash and chain', async () => {
    fetchMock.mockResolvedValue(response(200, transferReported));
    const transfer = {
      txHash: transferReported.txHash as PredictHex,
      chainId: 84532,
    };

    await expect(
      client.reportDepositTransfer(venueId, OPERATION_ID, transfer),
    ).resolves.toEqual(transferReported);

    const { url, init } = requestAt(fetchMock);
    expect(url).toBe(`${BASE}/${OPERATION_ID}/transfer`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(transfer);
  });

  it('cancels a deposit with no body', async () => {
    fetchMock.mockResolvedValue(response(200, cancelled));

    await expect(client.cancelDeposit(venueId, OPERATION_ID)).resolves.toEqual(
      cancelled,
    );

    const { url, init, headers } = requestAt(fetchMock);
    expect(url).toBe(`${BASE}/${OPERATION_ID}/cancel`);
    expect(init.method).toBe('POST');
    expect(init).not.toHaveProperty('body');
    expect(headers).not.toHaveProperty('Content-Type');
  });

  it('encodes the operation ID as one path segment', async () => {
    fetchMock.mockResolvedValue(response(200, cancelled));

    await client.cancelDeposit(venueId, '../orders');

    expect(requestAt(fetchMock).url).toBe(`${BASE}/..%2Forders/cancel`);
  });
});
