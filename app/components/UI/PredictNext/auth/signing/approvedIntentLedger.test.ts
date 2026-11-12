import SecureKeychain from '../../../../../core/SecureKeychain';
import {
  APPROVED_INTENT_TTL_MS,
  claimIntentSignature,
  clearApprovedIntents,
} from './approvedIntentLedger';
import { TemplateError } from './profileTemplates';

jest.mock('../../../../../core/SecureKeychain', () => ({
  setSecureItem: jest.fn(),
  getSecureItem: jest.fn(),
  clearSecureScope: jest.fn(),
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
}));

// The mobile TypeScript library target is ES2022, before Promise.withResolvers.
const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const claim = {
  operation: 'orders.commit',
  idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
  body: '{"ticker":"MKT"}',
  signLimit: 3,
  nowMs: 1_700_000_000_000,
  confirmed: true,
};

describe('approved intent ledger', () => {
  let saved: string | null;

  beforeEach(() => {
    saved = null;
    (SecureKeychain.getSecureItem as jest.Mock).mockImplementation(async () =>
      saved === null ? null : { key: 'approved-intents', value: saved },
    );
    (SecureKeychain.setSecureItem as jest.Mock).mockImplementation(
      async (_account: string, value: string) => {
        saved = value;
        return true;
      },
    );
    (SecureKeychain.clearSecureScope as jest.Mock).mockImplementation(
      async () => {
        saved = null;
      },
    );
  });

  it('requires confirmation for the first signature and then allows the same body', async () => {
    await expect(
      claimIntentSignature({ ...claim, confirmed: false }),
    ).rejects.toBeInstanceOf(TemplateError);

    await claimIntentSignature(claim);
    await claimIntentSignature({ ...claim, confirmed: false });
    await claimIntentSignature({ ...claim, confirmed: false });

    await expect(
      claimIntentSignature({ ...claim, confirmed: false }),
    ).rejects.toBeInstanceOf(TemplateError);
  });

  it('takes the sign limit from the claim', async () => {
    const two = { ...claim, signLimit: 2 };
    await claimIntentSignature(two);
    await claimIntentSignature({ ...two, confirmed: false });

    await expect(
      claimIntentSignature({ ...two, confirmed: false }),
    ).rejects.toBeInstanceOf(TemplateError);
  });

  it('replaces the pin when a different body is confirmed', async () => {
    await claimIntentSignature(claim);
    await claimIntentSignature({
      ...claim,
      body: '{"ticker":"OTHER"}',
      confirmed: true,
    });

    await claimIntentSignature({
      ...claim,
      body: '{"ticker":"OTHER"}',
      confirmed: false,
    });
  });

  it('allows a body-less claim of a live pin', async () => {
    await claimIntentSignature(claim);

    await claimIntentSignature({
      ...claim,
      body: undefined,
      confirmed: false,
    });
  });

  it('lets only the sign limit of concurrent claims through', async () => {
    await claimIntentSignature(claim);

    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        claimIntentSignature({ ...claim, confirmed: false }),
      ),
    );

    expect(results.map((result) => result.status)).toEqual([
      'fulfilled',
      'fulfilled',
      'rejected',
      'rejected',
    ]);
  });

  it('refuses a claim in flight when a clear lands, and keeps the ledger empty', async () => {
    const read = deferred<null>();
    const started = deferred<void>();
    (SecureKeychain.getSecureItem as jest.Mock).mockImplementationOnce(() => {
      started.resolve();
      return read.promise;
    });

    const pending = claimIntentSignature(claim);
    await started.promise;
    const cleared = clearApprovedIntents();
    read.resolve(null);

    await expect(pending).rejects.toBeInstanceOf(TemplateError);
    await cleared;
    expect(saved).toBeNull();
    await expect(
      claimIntentSignature({ ...claim, confirmed: false }),
    ).rejects.toBeInstanceOf(TemplateError);
  });

  it.each(['first claim', 'renewal'] as const)(
    'refuses a revoked %s after its write and orders clear before the next generation',
    async (phase) => {
      if (phase === 'renewal') {
        await claimIntentSignature(claim);
      }
      const write = deferred<boolean>();
      const started = deferred<void>();
      (SecureKeychain.setSecureItem as jest.Mock).mockImplementationOnce(
        async (_account: string, value: string) => {
          started.resolve();
          const stored = await write.promise;
          if (stored) {
            saved = value;
          }
          return stored;
        },
      );
      const pending = claimIntentSignature({
        ...claim,
        confirmed: phase === 'first claim',
      });
      await started.promise;
      const refused =
        await expect(pending).rejects.toBeInstanceOf(TemplateError);
      const cleared = clearApprovedIntents();
      const unconfirmed = claimIntentSignature({ ...claim, confirmed: false });
      const unconfirmedRefused =
        await expect(unconfirmed).rejects.toBeInstanceOf(TemplateError);
      const nextBody = '{"ticker":"NEW-GENERATION"}';
      const next = claimIntentSignature({ ...claim, body: nextBody });

      write.resolve(true);
      await refused;
      await cleared;
      await unconfirmedRefused;
      await next;

      // A reload sees only the new pin, never the delayed old write.
      await expect(
        claimIntentSignature({ ...claim, confirmed: false }),
      ).rejects.toBeInstanceOf(TemplateError);
      await expect(
        claimIntentSignature({ ...claim, body: nextBody, confirmed: false }),
      ).resolves.toBeUndefined();
    },
  );

  it('allows a new confirmation after a clear', async () => {
    await claimIntentSignature(claim);
    await clearApprovedIntents();

    await claimIntentSignature(claim);
    await claimIntentSignature({ ...claim, confirmed: false });
  });

  it('drops an expired pin and everything on clear', async () => {
    await claimIntentSignature(claim);

    await expect(
      claimIntentSignature({
        ...claim,
        nowMs: claim.nowMs + APPROVED_INTENT_TTL_MS + 1,
        confirmed: false,
      }),
    ).rejects.toBeInstanceOf(TemplateError);

    await clearApprovedIntents();
    await expect(
      claimIntentSignature({ ...claim, confirmed: false }),
    ).rejects.toBeInstanceOf(TemplateError);
  });
});
