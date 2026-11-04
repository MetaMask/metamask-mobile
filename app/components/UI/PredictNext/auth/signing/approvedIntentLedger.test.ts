import SecureKeychain from '../../../../../core/SecureKeychain';
import {
  APPROVED_INTENT_TTL_MS,
  claimIntentSignature,
  clearApprovedIntents,
} from './approvedIntentLedger';
import { TemplateError } from './venueTemplates';

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

  it('allows a read-only step of a live pin and refuses a scan outside the window', async () => {
    await claimIntentSignature(claim);

    await claimIntentSignature({
      ...claim,
      body: undefined,
      confirmed: false,
    });

    const pinnedSec = Math.floor(claim.nowMs / 1000);
    await claimIntentSignature({
      ...claim,
      body: undefined,
      confirmed: false,
      pinnedTimes: [{ seconds: pinnedSec - 600, maxBeforePinSec: 600 }],
    });
    await expect(
      claimIntentSignature({
        ...claim,
        body: undefined,
        confirmed: false,
        pinnedTimes: [{ seconds: pinnedSec - 601, maxBeforePinSec: 600 }],
      }),
    ).rejects.toBeInstanceOf(TemplateError);
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
