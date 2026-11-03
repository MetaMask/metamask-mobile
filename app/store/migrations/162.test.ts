import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './162';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const SESSION = {
  id: 'sid',
  finalStatus: 'pending',
  kycStatus: 'pending',
  externalUserId: 'ext',
  vendor: 'iron',
  vendorStatus: 'pending',
};

const withKyc = (KycController: unknown) => ({
  engine: { backgroundState: { KycController } },
});

const migratedKyc = (state: unknown) =>
  (state as { engine: { backgroundState: { KycController: unknown } } }).engine
    .backgroundState.KycController;

describe(`Migration ${migrationVersion}`, () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('returns state unchanged when KycController is missing', () => {
    const state = { engine: { backgroundState: {} } };
    expect(migrate(state)).toBe(state);
  });

  it('returns state unchanged when already migrated', () => {
    const state = withKyc({ sessions: {} });
    expect(migrate(state)).toBe(state);
  });

  it('reports and keeps malformed state', () => {
    const state = withKyc('nope');
    expect(migrate(state)).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalled();
  });

  it('migrates empty state to no sessions', () => {
    expect(
      migratedKyc(
        migrate(
          withKyc({
            email: null,
            vendor: null,
            geoCountry: null,
            sessionStatus: null,
            providerFlowStatus: 'not_started',
            vendorDisclaimersAccepted: { moonpay: null, iron: null },
            providerDisclaimersAccepted: { sumsub: null },
            idosDisclaimersAccepted: null,
            credentialReusabilityConsentGiven: null,
          }),
        ),
      ),
    ).toStrictEqual({ sessions: {} });
  });

  it('moves an Iron session to sessions.iron and keeps providerFlowStatus', () => {
    expect(
      migratedKyc(
        migrate(
          withKyc({
            email: 'a@b.co',
            vendor: 'iron',
            geoCountry: 'BRA',
            sessionStatus: SESSION,
            providerFlowStatus: 'submitted',
            vendorDisclaimersAccepted: {
              moonpay: null,
              iron: { disclaimerIds: ['t1'] },
            },
            providerDisclaimersAccepted: {
              sumsub: [{ key: 's', version: '1' }],
            },
            idosDisclaimersAccepted: [{ key: 'i', version: '1' }],
            credentialReusabilityConsentGiven: false,
          }),
        ),
      ),
    ).toStrictEqual({
      sessions: {
        iron: {
          sessionStatus: SESSION,
          providerFlowStatus: 'submitted',
          residenceCountry: 'BRA',
          vendorDisclaimersAccepted: {
            disclaimerIds: ['t1'],
            acceptedAt: null,
            submitted: true,
          },
          providerDisclaimersAccepted: [{ key: 's', version: '1' }],
          idosDisclaimersAccepted: [{ key: 'i', version: '1' }],
          credentialReusabilityConsentGiven: false,
        },
      },
    });
  });

  it('falls back to the session vendor when vendor is missing', () => {
    const result = migratedKyc(
      migrate(withKyc({ vendor: null, sessionStatus: SESSION })),
    ) as { sessions: Record<string, { sessionStatus: unknown }> };
    expect(result.sessions.iron.sessionStatus).toStrictEqual(SESSION);
  });

  it('drops a session with an unknown vendor and reports it', () => {
    expect(
      migratedKyc(
        migrate(
          withKyc({
            vendor: null,
            sessionStatus: { ...SESSION, vendor: 'sumsub' },
          }),
        ),
      ),
    ).toStrictEqual({ sessions: {} });
    expect(mockedCaptureException).toHaveBeenCalled();
  });
});
