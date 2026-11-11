import type { Identifier } from '@metamask/mfa-recovery-controller';
import { createSiweIdentifier } from '../../../../../core/Engine/controllers/mfa-recovery-controller/auth/identifiers';
import {
  findMissingCubistIdentifier,
  getCandidateIdentifiers,
  runAddCubistIdentifier,
  runRemoveCubistIdentifier,
} from './manageCubistIdentifiers';

const ADDRESS = '0xAbC';
const SIWE = createSiweIdentifier(ADDRESS);
const PASSKEY: Identifier = {
  type: 'passkey',
  namespace: 'auth.example',
  value: 'credential',
};
const AUTH_PASSKEY: Identifier = {
  ...PASSKEY,
  verifier: { rpId: 'auth.example' },
};
const SOCIAL: Identifier = {
  type: 'social',
  namespace: 'https://accounts.google.com',
  value: 'google-user',
};
const SEEDLESS_STATE = { authConnection: 'google', userId: 'google-user' };

function createDependencies({
  identifiers,
  authIdentifiers = [AUTH_PASSKEY],
  phase = 'idle',
}: {
  identifiers: Identifier[];
  authIdentifiers?: Identifier[];
  phase?: string;
}) {
  const controller = {
    getPhase: jest.fn().mockResolvedValue(phase),
    resume: jest.fn().mockResolvedValue(undefined),
    getIdentifiers: jest
      .fn()
      .mockResolvedValueOnce({ identifiers, epoch: 3, authIdentifiers })
      .mockResolvedValue({ identifiers: [], epoch: 4, authIdentifiers }),
    updateIdentifiers: jest.fn().mockResolvedValue(undefined),
  };
  return {
    controller,
    dependencies: {
      controller: controller as never,
      address: ADDRESS,
      verifyMfa: jest.fn().mockResolvedValue(undefined),
      seedless: { state: SEEDLESS_STATE },
    },
  };
}

describe('getCandidateIdentifiers', () => {
  it('uses Auth identifiers, the primary account for SIWE, and seedless for social', () => {
    expect(
      getCandidateIdentifiers([AUTH_PASSKEY], ADDRESS, SEEDLESS_STATE),
    ).toStrictEqual({ siwe: SIWE, passkey: AUTH_PASSKEY, social: SOCIAL });
  });

  it('leaves passkey and social undefined when nothing supplies them', () => {
    expect(getCandidateIdentifiers([], ADDRESS, {})).toStrictEqual({
      siwe: SIWE,
      passkey: undefined,
      social: undefined,
    });
  });
});

describe('findMissingCubistIdentifier', () => {
  const candidates = { siwe: SIWE, passkey: PASSKEY, social: SOCIAL };

  it('returns the first type not enrolled', () => {
    expect(findMissingCubistIdentifier([SIWE], candidates)).toStrictEqual({
      type: 'passkey',
      identifier: PASSKEY,
    });
  });

  it('skips a missing type that has no identifier to add', () => {
    expect(
      findMissingCubistIdentifier([SIWE], { siwe: SIWE, social: SOCIAL }),
    ).toStrictEqual({ type: 'social', identifier: SOCIAL });
  });

  it('returns the missing type without an identifier when none can be added', () => {
    expect(
      findMissingCubistIdentifier([SIWE, SOCIAL], { siwe: SIWE }),
    ).toStrictEqual({ type: 'passkey', identifier: undefined });
  });

  it('returns undefined when every type is enrolled', () => {
    expect(
      findMissingCubistIdentifier([SIWE, PASSKEY, SOCIAL], candidates),
    ).toBeUndefined();
  });
});

describe('runAddCubistIdentifier', () => {
  it('verifies MFA and adds the missing identifier, authorizing with SIWE', async () => {
    const { controller, dependencies } = createDependencies({
      identifiers: [SIWE, SOCIAL],
    });

    const result = await runAddCubistIdentifier(dependencies);

    expect(dependencies.verifyMfa).toHaveBeenCalled();
    expect(controller.updateIdentifiers).toHaveBeenCalledWith(
      SIWE,
      [SIWE, SOCIAL, AUTH_PASSKEY],
      3,
    );
    expect(result).toStrictEqual({
      identifierType: 'passkey',
      change: 'added',
      epoch: 4,
    });
  });

  it('resumes a pending operation first', async () => {
    const { controller, dependencies } = createDependencies({
      identifiers: [SIWE, SOCIAL],
      phase: 'writing',
    });

    await runAddCubistIdentifier(dependencies);

    expect(controller.resume).toHaveBeenCalled();
  });

  it('rejects when every type is enrolled', async () => {
    const { controller, dependencies } = createDependencies({
      identifiers: [SIWE, PASSKEY, SOCIAL],
    });

    await expect(runAddCubistIdentifier(dependencies)).rejects.toMatchObject({
      code: 'all_identifiers_enrolled',
    });
    expect(controller.updateIdentifiers).not.toHaveBeenCalled();
  });
});

describe('runRemoveCubistIdentifier', () => {
  it('removes the identifier and passes the enrolled set with Auth copies', async () => {
    const { controller, dependencies } = createDependencies({
      identifiers: [SIWE, PASSKEY, SOCIAL],
    });

    const result = await runRemoveCubistIdentifier(dependencies, SOCIAL);

    expect(controller.updateIdentifiers).toHaveBeenCalledWith(
      SIWE,
      [SIWE, AUTH_PASSKEY],
      3,
    );
    expect(result).toStrictEqual({
      identifierType: 'social',
      change: 'removed',
      epoch: 4,
    });
  });

  it('authorizes with a remaining identifier when SIWE is removed', async () => {
    const { controller, dependencies } = createDependencies({
      identifiers: [SIWE, PASSKEY, SOCIAL],
    });

    await runRemoveCubistIdentifier(dependencies, SIWE);

    expect(controller.updateIdentifiers).toHaveBeenCalledWith(
      AUTH_PASSKEY,
      [AUTH_PASSKEY, SOCIAL],
      3,
    );
  });

  it('rejects removing below two identifiers', async () => {
    const { controller, dependencies } = createDependencies({
      identifiers: [SIWE, SOCIAL],
    });

    await expect(
      runRemoveCubistIdentifier(dependencies, SOCIAL),
    ).rejects.toMatchObject({ code: 'too_few_identifiers' });
    expect(controller.updateIdentifiers).not.toHaveBeenCalled();
  });

  it('rejects an identifier that is not enrolled', async () => {
    const { dependencies } = createDependencies({
      identifiers: [SIWE, SOCIAL],
    });

    await expect(
      runRemoveCubistIdentifier(dependencies, PASSKEY),
    ).rejects.toMatchObject({ code: 'identifier_not_enrolled' });
  });
});
