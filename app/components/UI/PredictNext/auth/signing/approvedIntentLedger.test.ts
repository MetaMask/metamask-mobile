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
    let releaseRead: () => void = () => undefined;
    const read = new Promise<null>((resolve) => {
      releaseRead = () => resolve(null);
    });
    (SecureKeychain.getSecureItem as jest.Mock).mockImplementationOnce(
      () => read,
    );

    const pending = claimIntentSignature(claim);
    // Let the claim reach its keychain read before the clear lands.
    await new Promise((resolve) => setImmediate(resolve));
    const cleared = clearApprovedIntents();
    releaseRead();

    await expect(pending).rejects.toBeInstanceOf(TemplateError);
    await cleared;
    expect(saved).toBeNull();
    await expect(
      claimIntentSignature({ ...claim, confirmed: false }),
    ).rejects.toBeInstanceOf(TemplateError);
  });

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
