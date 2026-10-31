/**
 * Controller fields whose metadata sets includeInStateLogs to false.
 * cardHomeData and cardHomeDataAddress are reduced before export, so they are
 * not in this list.
 */
export const STATE_LOG_OMITTED_FIELDS = {
  CardController: [
    'providerUserId',
    'providerData',
    'signInLink',
    'accountLookupCache',
    'cardLinks',
    'cardHomeDataStatus',
    'cardHomeDataFetchedThisSession',
    'moneyAccountCardLinkInProgress',
  ],
  RewardsMoneyController: [
    'referralMe',
    'referralCodes',
    'referralFunnel',
    'earningsSummary',
    'earningsLedgerFirstPage',
    'claimHistoryFirstPage',
    'commissionsFirstPage',
    'claimById',
  ],
  RewardsController: ['rewardsEnvUrl'],
  UiSlotsController: [
    'enabled',
    'screenConfigurations',
    'activeConfigurations',
  ],
  QrSyncController: [
    'otp',
    'pendingSecretImports',
    'provisioningMetadata',
    'provisioningStatus',
  ],
} as const;

export const STATE_LOG_SEEDED_MARKERS = [
  'state-export-card-user',
  'state-export-linked-account',
  'state-export-referral-code',
  'state-export-claim-signature',
  'state-export-rewards-env',
  'state-export-ui-slot',
] as const;

const FIXTURE_ACCOUNT = '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3';

function existingController(
  background: Record<string, unknown>,
  name: string,
): Record<string, unknown> {
  const controller = background[name];
  if (!controller || typeof controller !== 'object') {
    return {};
  }
  return { ...(controller as Record<string, unknown>) };
}

/**
 * Writes non-empty values for fields excluded from state logs onto a fixture.
 * Existing controller fields are kept.
 * @param background - Engine background state to update.
 */
export function applyStateLogOmittedFields(
  background: Record<string, unknown>,
): void {
  const profileCache = {
    payload: {},
    lastFetched: 1,
  };

  background.CardController = {
    ...existingController(background, 'CardController'),
    providerUserId: 'state-export-card-user',
    providerData: { baanx: { location: 'us' } },
    signInLink: {
      providerId: 'baanx',
      status: 'started',
      address: FIXTURE_ACCOUNT,
      providerUserId: 'state-export-card-user',
      updatedAt: 1,
    },
    accountLookupCache: {
      [`baanx:${FIXTURE_ACCOUNT}`]: {
        result: 'found',
        checkedAt: 1,
      },
    },
    cardLinks: [
      {
        provider: 'baanx',
        status: 'active',
        linkedAccountRef: 'state-export-linked-account',
        closedReason: null,
        migratedToProvider: null,
        linkedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    cardHomeDataStatus: 'success',
    cardHomeDataFetchedThisSession: true,
    moneyAccountCardLinkInProgress: true,
  };

  background.RewardsMoneyController = {
    referralMe: {
      'profile-id': {
        lastFetched: 1,
        payload: {
          referral_code: { code: 'state-export-referral-code' },
        },
      },
    },
    referralCodes: {
      'profile-id': {
        lastFetched: 1,
        payload: { codes: [{ code: 'state-export-referral-code' }] },
      },
    },
    referralFunnel: {
      'profile-id': { ...profileCache, payload: { enrolled: 1 } },
    },
    earningsSummary: { 'profile-id:all': profileCache },
    earningsLedgerFirstPage: { 'profile-id:all': profileCache },
    claimHistoryFirstPage: {
      'profile-id': {
        lastFetched: 1,
        payload: {
          results: [{ signature: 'state-export-claim-signature' }],
        },
      },
    },
    commissionsFirstPage: { 'profile-id:all': profileCache },
    claimById: {
      'profile-id:claim-id': {
        lastFetched: 1,
        payload: { signature: 'state-export-claim-signature' },
      },
    },
  };

  background.RewardsController = {
    ...existingController(background, 'RewardsController'),
    rewardsEnvUrl: 'http://127.0.0.1:9/state-export-rewards-env',
  };

  background.UiSlotsController = {
    ...existingController(background, 'UiSlotsController'),
    enabled: true,
    screenConfigurations: {
      'home:en': {
        fetchedAt: 1,
        response: {
          slots: [{ contentId: 'state-export-ui-slot' }],
        },
      },
    },
    activeConfigurations: {
      home: { configurationKey: 'home:en', slotsById: {} },
    },
  };
}
