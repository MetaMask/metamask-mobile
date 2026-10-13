import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@metamask/utils';
import { CardController, defaultCardControllerState } from './CardController';
import type { CardService } from './services/CardService';
import { CardApiError } from './services/BaanxService';
import type {
  CardControllerMessenger,
  CardControllerState,
  CardLink,
} from './types';
import type { ICardProvider } from './provider-types';
import { CardTokenStore } from './CardTokenStore';
import Logger from '../../../../util/Logger';

jest.mock('./CardTokenStore');
jest.mock('./CardOnboardingStore');
jest.mock('../../../../util/Logger');
const mockTrackEvent = jest.fn();
jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  },
}));
jest.mock('../../../../util/remoteFeatureFlag', () => ({
  validatedVersionGatedFeatureFlag: (flag?: { enabled?: boolean }) =>
    flag && typeof flag === 'object' && 'enabled' in flag
      ? (flag.enabled ?? false)
      : undefined,
}));
jest.mock('../../../redux', () => ({
  __esModule: true,
  default: { store: { dispatch: jest.fn(), getState: () => ({}) } },
}));

const SELECTED_ADDRESS = '0xAbC0000000000000000000000000000000000001';
const CARDHOLDER_ADDRESS = '0xDeF0000000000000000000000000000000000002';

const testSha256 = async (text: string): Promise<Uint8Array> =>
  sha256(new TextEncoder().encode(text));

const refFor = (address: string) =>
  bytesToHex(sha256(new TextEncoder().encode(address.toLowerCase())));

const link = (overrides: Partial<CardLink> = {}): CardLink => ({
  provider: 'baanx',
  status: 'active',
  linkedAccountRef: null,
  closedReason: null,
  migratedToProvider: null,
  linkedAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

const apiError = (status: number, body: unknown = '') =>
  new CardApiError(
    status,
    '/v1/card/links',
    typeof body === 'string' ? body : JSON.stringify(body),
  );

interface Setup {
  flagEnabled?: boolean;
  basicFunctionality?: boolean;
  state?: Partial<CardControllerState>;
  getBearerToken?: jest.Mock;
  provider?: Partial<ICardProvider>;
}

function setup({
  flagEnabled = true,
  basicFunctionality = true,
  state = {},
  getBearerToken = jest.fn().mockResolvedValue('token-1'),
  provider = {},
}: Setup = {}) {
  const subscriptions: Record<string, (...args: unknown[]) => void> = {};
  const messenger = {
    subscribe: jest.fn((event: string, handler: () => void) => {
      subscriptions[event] = handler;
    }),
    call: jest.fn((action: string, ...args: unknown[]) => {
      switch (action) {
        case 'RemoteFeatureFlagController:getState':
          return {
            remoteFeatureFlags: {
              cardLinkApi: { enabled: flagEnabled, minimumVersion: '0.0.0' },
            },
          };
        case 'AuthenticationController:getBearerToken':
          return getBearerToken(...args);
        case 'AccountsController:getState':
          return {
            internalAccounts: {
              accounts: {
                'id-1': {
                  id: 'id-1',
                  address: SELECTED_ADDRESS,
                  type: 'eip155:eoa',
                  scopes: ['eip155:0'],
                },
              },
              selectedAccount: 'id-1',
            },
          };
        case 'AccountTreeController:getAccountFromSelectedAccountGroup':
          return {
            id: 'id-1',
            address: SELECTED_ADDRESS,
            type: 'eip155:eoa',
            scopes: ['eip155:0'],
          };
        default:
          return undefined;
      }
    }),
    publish: jest.fn(),
    registerActionHandler: jest.fn(),
    registerInitialEventPayload: jest.fn(),
    unregisterActionHandler: jest.fn(),
  } as unknown as CardControllerMessenger;

  const cardService = {
    getSupportedRegions: jest.fn(),
    getCardLinks: jest.fn().mockResolvedValue([]),
    putCardLink: jest.fn(
      async (providerId: CardLink['provider'], body: { status: string }) =>
        link({
          provider: providerId,
          status: body.status as CardLink['status'],
        }),
    ),
  };

  const baanx = {
    id: 'baanx',
    capabilities: {},
    submitCredentials: jest.fn(),
    ...provider,
  } as unknown as ICardProvider;

  const controller = new CardController({
    messenger,
    providers: { baanx, immersve: { ...baanx, id: 'immersve' } },
    cardService: cardService as unknown as CardService,
    state: { ...defaultCardControllerState, ...state },
    sha256: testSha256,
    isBasicFunctionalityEnabled: () => basicFunctionality,
  });

  return { controller, cardService, messenger, getBearerToken, subscriptions };
}

/** Lets fire-and-forget card-link promises settle. */
const flush = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('CardController card links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchCardLinks', () => {
    it('stores the bare array from GET /v1/card/links', async () => {
      const { controller, cardService } = setup();
      const links = [
        link(),
        link({ provider: 'immersve', status: 'onboarding' }),
      ];
      cardService.getCardLinks.mockResolvedValue(links);

      await controller.fetchCardLinks();

      expect(controller.state.cardLinks).toStrictEqual(links);
      expect(controller.state.cardLinksFetchedAt).toStrictEqual(
        expect.any(Number),
      );
    });

    it('calls getBearerToken with no argument', async () => {
      const { controller, messenger, cardService } = setup();

      await controller.fetchCardLinks();

      expect(messenger.call).toHaveBeenCalledWith(
        'AuthenticationController:getBearerToken',
      );
      expect(cardService.getCardLinks).toHaveBeenCalledWith('token-1');
    });

    it('makes no call when cardLinkApiEnabled is off', async () => {
      const { controller, cardService, getBearerToken } = setup({
        flagEnabled: false,
      });

      await controller.fetchCardLinks();

      expect(getBearerToken).not.toHaveBeenCalled();
      expect(cardService.getCardLinks).not.toHaveBeenCalled();
      expect(controller.state.cardLinks).toBeNull();
    });

    it('re-authenticates and retries the same call once on 401', async () => {
      const getBearerToken = jest
        .fn()
        .mockResolvedValueOnce('expired-token')
        .mockResolvedValueOnce('fresh-token');
      const { controller, cardService } = setup({ getBearerToken });
      cardService.getCardLinks
        .mockRejectedValueOnce(apiError(401))
        .mockResolvedValueOnce([link()]);

      await controller.fetchCardLinks();

      expect(cardService.getCardLinks).toHaveBeenNthCalledWith(
        1,
        'expired-token',
      );
      expect(cardService.getCardLinks).toHaveBeenNthCalledWith(
        2,
        'fresh-token',
      );
      expect(controller.state.cardLinks).toStrictEqual([link()]);
    });

    it('keeps existing links when a 401 persists, and never treats it as no card', async () => {
      const existing = [link()];
      const { controller, cardService } = setup({
        state: {
          cardLinks: existing,
          cardLinksFetchedAt: Date.now() - 24 * 60 * 60 * 1000 - 1,
        },
      });
      cardService.getCardLinks.mockRejectedValue(apiError(401));

      await controller.fetchCardLinks();

      expect(cardService.getCardLinks).toHaveBeenCalledTimes(2);
      expect(controller.state.cardLinks).toStrictEqual(existing);
    });

    it('reuses a fetch from the last 24 hours', async () => {
      const { controller, cardService } = setup({
        state: { cardLinks: [link()], cardLinksFetchedAt: Date.now() },
      });

      await controller.fetchCardLinks();

      expect(cardService.getCardLinks).not.toHaveBeenCalled();
    });

    it('refetches a stale result, or when forced', async () => {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000 - 1;
      const stale = setup({
        state: { cardLinks: [link()], cardLinksFetchedAt: dayAgo },
      });
      await stale.controller.fetchCardLinks();
      expect(stale.cardService.getCardLinks).toHaveBeenCalledTimes(1);

      const fresh = setup({
        state: { cardLinks: [link()], cardLinksFetchedAt: Date.now() },
      });
      await fresh.controller.fetchCardLinks({ force: true });
      expect(fresh.cardService.getCardLinks).toHaveBeenCalledTimes(1);
    });

    it('does not let an in-flight GET replace a newer write', async () => {
      const { controller, cardService } = setup({
        state: { cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`] },
      });
      const stale = deferred<CardLink[]>();
      const current = [
        link({ provider: 'immersve', status: 'active' }),
        link(),
      ];
      cardService.getCardLinks
        .mockImplementationOnce(() => stale.promise)
        .mockResolvedValueOnce(current);

      const pending = controller.fetchCardLinks();
      await flush();
      await controller.recordCardActivated({ provider: 'immersve' });
      stale.resolve([]);
      await pending;

      expect(cardService.getCardLinks).toHaveBeenCalledTimes(2);
      expect(cardService.putCardLink).toHaveBeenCalledTimes(1);
      expect(controller.state.cardLinks).toStrictEqual(current);
    });

    it('keeps the write when the read after it fails', async () => {
      const { controller, cardService } = setup({
        state: { cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`] },
      });
      const stale = deferred<CardLink[]>();
      cardService.getCardLinks
        .mockImplementationOnce(() => stale.promise)
        .mockRejectedValueOnce(apiError(503));

      const pending = controller.fetchCardLinks();
      await flush();
      await controller.recordCardActivated({ provider: 'immersve' });
      stale.resolve([]);
      await pending;

      expect(controller.state.cardLinks).toStrictEqual([
        link({ provider: 'immersve', status: 'active' }),
      ]);
      expect(controller.state.cardLinksFetchedAt).toBeNull();
      expect(cardService.putCardLink).toHaveBeenCalledTimes(1);
    });

    it('still stores a GET that overlaps a failed write', async () => {
      const { controller, cardService } = setup();
      const pendingGet = deferred<CardLink[]>();
      const links = [link()];
      cardService.getCardLinks.mockImplementationOnce(() => pendingGet.promise);
      cardService.putCardLink.mockRejectedValueOnce(apiError(503));

      const pending = controller.fetchCardLinks();
      await flush();
      await controller.recordCardActivated({ provider: 'immersve' });
      pendingGet.resolve(links);
      await pending;

      expect(cardService.getCardLinks).toHaveBeenCalledTimes(1);
      expect(controller.state.cardLinks).toStrictEqual(links);
    });

    it('shares one in-flight request between concurrent callers', async () => {
      const { controller, cardService } = setup();

      await Promise.all([
        controller.fetchCardLinks(),
        controller.fetchCardLinks(),
      ]);

      expect(cardService.getCardLinks).toHaveBeenCalledTimes(1);
    });

    it('treats 403 CARD_LINK_CLIENT_NOT_ALLOWED as the flag being off', async () => {
      const { controller, cardService } = setup({
        state: { cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`] },
      });
      cardService.getCardLinks.mockRejectedValue(
        apiError(403, { code: 'CARD_LINK_CLIENT_NOT_ALLOWED' }),
      );

      await controller.fetchCardLinks();
      await controller.recordCardActivated({ provider: 'immersve' });
      await controller.fetchCardLinks({ force: true });

      expect(cardService.getCardLinks).toHaveBeenCalledTimes(1);
      expect(cardService.putCardLink).not.toHaveBeenCalled();
      expect(controller.state.cardLinks).toBeNull();
      expect(controller.state.cardLinkApiBlocked).toBe(true);
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('does not report offline or timeout errors', async () => {
      for (const status of [0, 408]) {
        const { controller, cardService } = setup();
        cardService.getCardLinks.mockRejectedValue(apiError(status));
        await controller.fetchCardLinks();
      }
      expect(Logger.error).not.toHaveBeenCalled();

      const { controller, cardService } = setup();
      cardService.getCardLinks.mockRejectedValue(apiError(503));
      await controller.fetchCardLinks();
      expect(Logger.error).toHaveBeenCalledTimes(1);
    });

    it('makes no call when Basic Functionality is off', async () => {
      const { controller, cardService, getBearerToken } = setup({
        basicFunctionality: false,
      });

      await controller.fetchCardLinks();
      await controller.recordCardActivated({ provider: 'immersve' });

      expect(getBearerToken).not.toHaveBeenCalled();
      expect(cardService.getCardLinks).not.toHaveBeenCalled();
      expect(cardService.putCardLink).not.toHaveBeenCalled();
    });

    it('fetches when the cardLinkApi flag changes', async () => {
      const { cardService, subscriptions } = setup();

      subscriptions['RemoteFeatureFlagController:stateChange']('{}');
      await flush();

      expect(cardService.getCardLinks).toHaveBeenCalledTimes(1);
    });

    it('does not seed when the fetch fails', async () => {
      const { controller, cardService } = setup({
        state: { cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`] },
      });
      cardService.getCardLinks.mockRejectedValue(apiError(503));

      await controller.fetchCardLinks();

      expect(cardService.putCardLink).not.toHaveBeenCalled();
      expect(controller.state.cardLinks).toBeNull();
    });

    it('fetches on wallet unlock', async () => {
      const { cardService, subscriptions } = setup();
      jest.spyOn(CardTokenStore, 'get').mockResolvedValue(null);

      subscriptions['KeyringController:unlock']();
      await flush();

      expect(cardService.getCardLinks).toHaveBeenCalledTimes(1);
    });
  });

  describe('seeding an existing cardholder', () => {
    it('seeds once when the read is empty and the card_user label is positive', async () => {
      const { controller, cardService } = setup({
        state: { cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`] },
      });

      await controller.fetchCardLinks();

      expect(cardService.putCardLink).toHaveBeenCalledTimes(1);
      expect(cardService.putCardLink).toHaveBeenCalledWith(
        'baanx',
        { status: 'active', linkedAccountRef: refFor(CARDHOLDER_ADDRESS) },
        'token-1',
      );
      expect(controller.state.cardLinksSeeded).toBe(true);
      expect(controller.state.cardLinks).toStrictEqual([
        link({ provider: 'baanx', status: 'active' }),
      ]);
    });

    it('tracks Card Link Seeded with the outcome and no account data', async () => {
      const { controller } = setup({
        state: { cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`] },
      });

      await controller.fetchCardLinks();

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const [event] = mockTrackEvent.mock.calls[0];
      expect(event.name).toBe('Card Link Seeded');
      expect(event.properties).toStrictEqual({
        provider: 'baanx',
        outcome: 'written',
      });
    });

    it('tracks a failed seed attempt', async () => {
      const { controller, cardService } = setup({
        state: { cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`] },
      });
      cardService.putCardLink.mockRejectedValue(apiError(503));

      await controller.fetchCardLinks();

      const [event] = mockTrackEvent.mock.calls[0];
      expect(event.properties).toMatchObject({ outcome: 'failed' });
    });

    it('does not track a seed event when no seed is needed', async () => {
      const { controller } = setup({ state: { cardholderAccounts: [] } });

      await controller.fetchCardLinks();

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('never seeds twice', async () => {
      const { controller, cardService } = setup({
        state: {
          cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`],
          cardLinksSeeded: true,
        },
      });

      await controller.fetchCardLinks();

      expect(cardService.putCardLink).not.toHaveBeenCalled();
    });

    it('writes nothing when the card_user label is negative', async () => {
      const { controller, cardService } = setup({
        state: { cardholderAccounts: [] },
      });

      await controller.fetchCardLinks();

      expect(cardService.putCardLink).not.toHaveBeenCalled();
      expect(controller.state.cardLinks).toStrictEqual([]);
      expect(controller.state.cardLinksSeeded).toBe(false);
    });

    it('does not seed when the profile already has links', async () => {
      const { controller, cardService } = setup({
        state: { cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`] },
      });
      cardService.getCardLinks.mockResolvedValue([link()]);

      await controller.fetchCardLinks();

      expect(cardService.putCardLink).not.toHaveBeenCalled();
    });

    it('seeds when the label arrives after an empty read', async () => {
      const { controller, cardService } = setup();
      await controller.fetchCardLinks();
      expect(cardService.putCardLink).not.toHaveBeenCalled();

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ is: [`eip155:0:${CARDHOLDER_ADDRESS}`] }),
      }) as unknown as typeof fetch;
      await controller.checkCardholderAccounts(
        [`eip155:0:${CARDHOLDER_ADDRESS}`],
        'https://accounts.example',
      );
      await flush();

      expect(cardService.putCardLink).toHaveBeenCalledTimes(1);
      expect(controller.state.cardLinksSeeded).toBe(true);
    });

    it('does not retry a failed seed in the same session', async () => {
      const { controller, cardService } = setup({
        state: { cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`] },
      });
      cardService.putCardLink.mockRejectedValueOnce(apiError(503));

      await controller.fetchCardLinks();
      expect(controller.state.cardLinksSeeded).toBe(false);

      await controller.fetchCardLinks({ force: true });
      expect(cardService.putCardLink).toHaveBeenCalledTimes(1);
    });

    it('does not seed from a stale empty read when the fetch fails', async () => {
      const { controller, cardService } = setup({
        state: {
          cardLinks: [],
          cardLinksFetchedAt: Date.now() - 25 * 60 * 60 * 1000,
          cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`],
        },
      });
      cardService.getCardLinks.mockRejectedValue(apiError(503));

      await controller.fetchCardLinks();

      expect(cardService.putCardLink).not.toHaveBeenCalled();
    });

    it('seeds with the selected account when it is a cardholder account', async () => {
      const { controller, cardService } = setup({
        state: {
          cardholderAccounts: [
            `eip155:0:${CARDHOLDER_ADDRESS}`,
            `eip155:0:${SELECTED_ADDRESS.toLowerCase()}`,
          ],
        },
      });

      await controller.fetchCardLinks();

      expect(cardService.putCardLink).toHaveBeenCalledWith(
        'baanx',
        { status: 'active', linkedAccountRef: refFor(SELECTED_ADDRESS) },
        'token-1',
      );
    });

    it('ends the seed on a 400 without retrying it', async () => {
      const { controller, cardService } = setup({
        state: { cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`] },
      });
      cardService.putCardLink.mockRejectedValue(apiError(400));

      await controller.fetchCardLinks();
      await controller.fetchCardLinks({ force: true });

      expect(cardService.putCardLink).toHaveBeenCalledTimes(1);
      expect(controller.state.cardLinksSeeded).toBe(true);
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('milestone writes', () => {
    it('records Immersve onboarding with providerCardholderId and linkedAccountRef', async () => {
      const { controller, cardService } = setup();

      await controller.recordProviderOnboardingStarted({
        provider: 'immersve',
        address: SELECTED_ADDRESS,
        providerCardholderId: 'chacc-1',
      });

      expect(cardService.putCardLink).toHaveBeenCalledWith(
        'immersve',
        {
          status: 'onboarding',
          providerCardholderId: 'chacc-1',
          linkedAccountRef: refFor(SELECTED_ADDRESS),
        },
        'token-1',
      );
      const [, body] = cardService.putCardLink.mock.calls[0];
      expect(body).not.toHaveProperty('cardholderId');
    });

    it('reads the cardholder ID from the token store when none is given', async () => {
      const { controller, cardService } = setup();
      jest
        .spyOn(CardTokenStore, 'get')
        .mockResolvedValue({ cardholderAccountId: 'chacc-stored' } as never);

      await controller.recordProviderOnboardingStarted({
        provider: 'immersve',
        address: SELECTED_ADDRESS,
      });
      await controller.recordCardActivated({ provider: 'immersve' });

      expect(CardTokenStore.get).toHaveBeenCalledWith('immersve');
      const bodies = cardService.putCardLink.mock.calls.map(([, b]) => b);
      expect(bodies[0]).toMatchObject({ providerCardholderId: 'chacc-stored' });
      expect(bodies[1]).toMatchObject({ providerCardholderId: 'chacc-stored' });
    });

    it('still writes when the token store cannot be read', async () => {
      const { controller, cardService } = setup();
      jest
        .spyOn(CardTokenStore, 'get')
        .mockRejectedValue(new Error('keychain'));

      await controller.recordCardActivated({ provider: 'immersve' });

      expect(cardService.putCardLink).toHaveBeenCalledWith(
        'immersve',
        { status: 'active' },
        'token-1',
      );
    });

    it('records the Immersve card as active with a status-only body', async () => {
      const { controller, cardService } = setup();

      await controller.recordCardActivated({ provider: 'immersve' });

      expect(cardService.putCardLink).toHaveBeenCalledWith(
        'immersve',
        { status: 'active' },
        'token-1',
      );
    });

    it('records a Baanx login as active when it completes', async () => {
      const submitCredentials = jest.fn().mockResolvedValue({
        done: true,
        tokenSet: {
          accessToken: 'at',
          accessTokenExpiresAt: Date.now() + 60_000,
          location: 'international',
        },
      });
      const { controller, cardService } = setup({
        provider: { submitCredentials },
        state: { cardLinks: [], cardLinksFetchedAt: Date.now() },
      });
      jest.spyOn(CardTokenStore, 'set').mockResolvedValue(true);
      (controller as unknown as { currentSession: unknown }).currentSession = {
        id: 's',
        currentStep: { type: 'email_password' },
        _metadata: {},
      };

      await controller.submitCredentials({
        type: 'email_password',
        email: 'e',
        password: 'p',
      });
      await flush();

      expect(cardService.putCardLink).toHaveBeenCalledWith(
        'baanx',
        { status: 'active', linkedAccountRef: refFor(SELECTED_ADDRESS) },
        'token-1',
      );
    });

    it('records a Baanx login as onboarding when the session still needs onboarding', async () => {
      const submitCredentials = jest.fn().mockResolvedValue({
        done: false,
        onboardingRequired: { sessionId: 'u-1', phase: 'PHONE_NUMBER' },
      });
      const { controller, cardService } = setup({
        provider: { submitCredentials },
        state: { cardLinks: [], cardLinksFetchedAt: Date.now() },
      });
      (controller as unknown as { currentSession: unknown }).currentSession = {
        id: 's',
        currentStep: { type: 'email_password' },
        _metadata: {},
      };

      await controller.submitCredentials({
        type: 'email_password',
        email: 'e',
        password: 'p',
      });
      await flush();

      expect(cardService.putCardLink).toHaveBeenCalledWith(
        'baanx',
        { status: 'onboarding', linkedAccountRef: refFor(SELECTED_ADDRESS) },
        'token-1',
      );
    });

    it('does not move linkedAccountRef to a non-cardholder account on Baanx login', async () => {
      const submitCredentials = jest.fn().mockResolvedValue({
        done: true,
        tokenSet: {
          accessToken: 'at',
          accessTokenExpiresAt: Date.now() + 60_000,
          location: 'international',
        },
      });
      const { controller, cardService } = setup({
        provider: { submitCredentials },
        state: {
          cardholderAccounts: [`eip155:0:${CARDHOLDER_ADDRESS}`],
          cardLinks: [link({ linkedAccountRef: refFor(CARDHOLDER_ADDRESS) })],
        },
      });
      jest.spyOn(CardTokenStore, 'set').mockResolvedValue(true);
      (controller as unknown as { currentSession: unknown }).currentSession = {
        id: 's',
        currentStep: { type: 'email_password' },
        _metadata: {},
      };

      await controller.submitCredentials({
        type: 'email_password',
        email: 'e',
        password: 'p',
      });
      await flush();

      expect(cardService.putCardLink).toHaveBeenCalledWith(
        'baanx',
        { status: 'active' },
        'token-1',
      );
    });

    it('sends no linkedAccountRef on Baanx login while links are not loaded', async () => {
      const submitCredentials = jest.fn().mockResolvedValue({
        done: true,
        tokenSet: {
          accessToken: 'at',
          accessTokenExpiresAt: Date.now() + 60_000,
          location: 'international',
        },
      });
      const { controller, cardService } = setup({
        provider: { submitCredentials },
        state: { cardLinks: null },
      });
      jest.spyOn(CardTokenStore, 'set').mockResolvedValue(true);
      (controller as unknown as { currentSession: unknown }).currentSession = {
        id: 's',
        currentStep: { type: 'email_password' },
        _metadata: {},
      };

      await controller.submitCredentials({
        type: 'email_password',
        email: 'e',
        password: 'p',
      });
      await flush();

      expect(cardService.putCardLink).toHaveBeenCalledWith(
        'baanx',
        { status: 'active' },
        'token-1',
      );
    });

    it('sends linkedAccountRef on Baanx login when the selected account is a cardholder account', async () => {
      const submitCredentials = jest.fn().mockResolvedValue({
        done: true,
        tokenSet: {
          accessToken: 'at',
          accessTokenExpiresAt: Date.now() + 60_000,
          location: 'international',
        },
      });
      const { controller, cardService } = setup({
        provider: { submitCredentials },
        state: {
          cardholderAccounts: [`eip155:0:${SELECTED_ADDRESS.toLowerCase()}`],
          cardLinks: [link({ linkedAccountRef: refFor(CARDHOLDER_ADDRESS) })],
        },
      });
      jest.spyOn(CardTokenStore, 'set').mockResolvedValue(true);
      (controller as unknown as { currentSession: unknown }).currentSession = {
        id: 's',
        currentStep: { type: 'email_password' },
        _metadata: {},
      };

      await controller.submitCredentials({
        type: 'email_password',
        email: 'e',
        password: 'p',
      });
      await flush();

      expect(cardService.putCardLink).toHaveBeenCalledWith(
        'baanx',
        { status: 'active', linkedAccountRef: refFor(SELECTED_ADDRESS) },
        'token-1',
      );
    });

    it('does not block a Baanx login when the write fails', async () => {
      const submitCredentials = jest.fn().mockResolvedValue({
        done: true,
        tokenSet: {
          accessToken: 'at',
          accessTokenExpiresAt: Date.now() + 60_000,
          location: 'international',
        },
      });
      const { controller, cardService } = setup({
        provider: { submitCredentials },
      });
      jest.spyOn(CardTokenStore, 'set').mockResolvedValue(true);
      cardService.putCardLink.mockRejectedValue(apiError(500));
      (controller as unknown as { currentSession: unknown }).currentSession = {
        id: 's',
        currentStep: { type: 'email_password' },
        _metadata: {},
      };

      const result = await controller.submitCredentials({
        type: 'email_password',
        email: 'e',
        password: 'p',
      });
      await flush();

      expect(result.done).toBe(true);
      expect(cardService.putCardLink).toHaveBeenCalledTimes(1);
      expect(Logger.error).toHaveBeenCalled();
    });

    it('records activation with the address and cardholder ID', async () => {
      const { controller, cardService } = setup();

      await controller.recordCardActivated({
        provider: 'immersve',
        address: SELECTED_ADDRESS,
        providerCardholderId: 'chacc-1',
      });

      expect(cardService.putCardLink).toHaveBeenCalledWith(
        'immersve',
        {
          status: 'active',
          providerCardholderId: 'chacc-1',
          linkedAccountRef: refFor(SELECTED_ADDRESS),
        },
        'token-1',
      );
    });

    it('runs writes for one provider in order, so a slow onboarding write cannot replace active', async () => {
      const { controller, cardService } = setup();
      let finishOnboarding!: (value: CardLink) => void;
      cardService.putCardLink.mockImplementationOnce(
        () =>
          new Promise<CardLink>((resolve) => {
            finishOnboarding = resolve;
          }),
      );

      const onboarding = controller.recordProviderOnboardingStarted({
        provider: 'immersve',
        address: SELECTED_ADDRESS,
      });
      const activated = controller.recordCardActivated({
        provider: 'immersve',
      });
      await flush();
      expect(cardService.putCardLink).toHaveBeenCalledTimes(1);

      finishOnboarding(link({ provider: 'immersve', status: 'onboarding' }));
      await Promise.all([onboarding, activated]);

      expect(cardService.putCardLink).toHaveBeenCalledTimes(2);
      expect(
        cardService.putCardLink.mock.calls.map(([, body]) => body.status),
      ).toStrictEqual(['onboarding', 'active']);
      expect(controller.state.cardLinks).toStrictEqual([
        link({ provider: 'immersve', status: 'active' }),
      ]);
    });

    it('resolves without throwing when a write fails', async () => {
      const { controller, cardService } = setup();
      cardService.putCardLink.mockRejectedValue(new Error('network down'));

      await expect(
        controller.recordCardActivated({ provider: 'immersve' }),
      ).resolves.toBeUndefined();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('logs a 400 and does not retry it', async () => {
      const { controller, cardService } = setup();
      cardService.putCardLink.mockRejectedValue(apiError(400));

      await controller.recordCardActivated({ provider: 'immersve' });

      expect(cardService.putCardLink).toHaveBeenCalledTimes(1);
      expect(Logger.error).toHaveBeenCalledTimes(1);
    });

    it('retries a write once after a 401', async () => {
      const { controller, cardService } = setup();
      cardService.putCardLink.mockRejectedValueOnce(apiError(401));

      await controller.recordCardActivated({ provider: 'immersve' });

      expect(cardService.putCardLink).toHaveBeenCalledTimes(2);
    });

    it('omits a field longer than 128 characters instead of sending a 400', async () => {
      const { controller, cardService } = setup();

      await controller.recordProviderOnboardingStarted({
        provider: 'immersve',
        address: SELECTED_ADDRESS,
        providerCardholderId: 'x'.repeat(129),
      });

      const [, body] = cardService.putCardLink.mock.calls[0];
      expect(body).not.toHaveProperty('providerCardholderId');
    });

    it('sends nothing when cardLinkApiEnabled is off', async () => {
      const { controller, cardService } = setup({ flagEnabled: false });

      await controller.recordProviderOnboardingStarted({
        provider: 'immersve',
        address: SELECTED_ADDRESS,
        providerCardholderId: 'chacc-1',
      });
      await controller.recordCardActivated({ provider: 'immersve' });
      await controller.recordProviderLogin({
        provider: 'baanx',
        phase: 'active',
        address: SELECTED_ADDRESS,
      });

      expect(cardService.putCardLink).not.toHaveBeenCalled();
    });

    it('replaces the stored row for the provider with the returned row', async () => {
      const { controller } = setup({
        state: {
          cardLinks: [
            link({ provider: 'immersve', status: 'onboarding' }),
            link({ provider: 'baanx', status: 'closed' }),
          ],
        },
      });

      await controller.recordCardActivated({ provider: 'immersve' });

      expect(controller.state.cardLinks).toStrictEqual([
        link({ provider: 'baanx', status: 'closed' }),
        link({ provider: 'immersve', status: 'active' }),
      ]);
    });
  });

  it('clears card links on resetAll', async () => {
    const { controller } = setup({
      state: {
        cardLinks: [link()],
        cardLinksFetchedAt: Date.now(),
        cardLinksSeeded: true,
      },
    });
    jest.spyOn(CardTokenStore, 'get').mockResolvedValue(null);

    await controller.resetAll();

    expect(controller.state.cardLinks).toBeNull();
    expect(controller.state.cardLinksFetchedAt).toBeNull();
    expect(controller.state.cardLinksSeeded).toBe(false);
  });
});
