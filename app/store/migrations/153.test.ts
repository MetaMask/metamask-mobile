import { captureException } from '@sentry/react-native';
import {
  BRAZE_PUSH_REGISTRATION_STATE,
  LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
} from '../../constants/storage';
import StorageWrapper from '../storage-wrapper';
import migrate, { migrationVersion } from './153';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('../storage-wrapper', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
  },
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockCaptureException = jest.mocked(captureException);
const mockEnsureValidState = jest.mocked(ensureValidState);
const mockStorageWrapper = jest.mocked(StorageWrapper);

const createState = ({
  notificationsEnabled,
  pushEnabled,
  marketingConsent = false,
}: {
  notificationsEnabled?: boolean;
  pushEnabled?: boolean;
  marketingConsent?: boolean;
}) => ({
  security: {
    dataCollectionForMarketing: marketingConsent,
  },
  engine: {
    backgroundState: {
      NotificationServicesController:
        notificationsEnabled === undefined
          ? undefined
          : { isNotificationServicesEnabled: notificationsEnabled },
      NotificationServicesPushController:
        pushEnabled === undefined ? undefined : { isPushEnabled: pushEnabled },
    },
  },
});

describe(`Migration ${migrationVersion}: mark legacy notification backfills`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureValidState.mockReturnValue(true);
    mockStorageWrapper.setItem.mockResolvedValue(undefined);
  });

  it('returns state unchanged without writing markers when state is invalid', async () => {
    const state = createState({
      notificationsEnabled: false,
      pushEnabled: false,
    });
    mockEnsureValidState.mockReturnValue(false);

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(mockStorageWrapper.setItem).not.toHaveBeenCalled();
  });

  it('marks enabled notification users for an AUS preferences backfill', async () => {
    const state = createState({
      notificationsEnabled: true,
      pushEnabled: true,
    });

    await migrate(state);

    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
      'true',
    );
    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      BRAZE_PUSH_REGISTRATION_STATE,
      'registered',
    );
  });

  it('marks devices with push disabled for Braze unregistration', async () => {
    const state = createState({
      notificationsEnabled: true,
      pushEnabled: false,
    });

    await migrate(state);

    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      BRAZE_PUSH_REGISTRATION_STATE,
      'unregistration-pending',
    );
  });

  it('marks devices with master notifications disabled for Braze unregistration', async () => {
    const state = createState({
      notificationsEnabled: false,
      pushEnabled: true,
    });

    await migrate(state);

    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      BRAZE_PUSH_REGISTRATION_STATE,
      'unregistration-pending',
    );
  });

  it('marks users with marketing consent for AUS backfill when notification state is disabled', async () => {
    const state = createState({
      notificationsEnabled: false,
      pushEnabled: false,
      marketingConsent: true,
    });

    await migrate(state);

    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
      'true',
    );
    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      BRAZE_PUSH_REGISTRATION_STATE,
      'unregistration-pending',
    );
  });

  it('conservatively marks devices with missing notification state for Braze unregistration', async () => {
    const state = createState({});

    await migrate(state);

    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      BRAZE_PUSH_REGISTRATION_STATE,
      'unregistration-pending',
    );
    expect(mockStorageWrapper.setItem).not.toHaveBeenCalledWith(
      LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
      expect.anything(),
    );
  });

  it('records each marker failure independently', async () => {
    const state = createState({
      notificationsEnabled: true,
      pushEnabled: false,
    });
    mockStorageWrapper.setItem.mockImplementation(async (key) => {
      if (key === LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING) {
        throw new Error('AUS marker write failed');
      }
    });

    await expect(migrate(state)).rejects.toThrow(
      'Failed to persist backfill value(s): legacy notification AUS backfill',
    );

    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      BRAZE_PUSH_REGISTRATION_STATE,
      'unregistration-pending',
    );
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('AUS marker write failed'),
      }),
    );
  });

  it('reports Braze registration-state persistence failures', async () => {
    const state = createState({
      notificationsEnabled: false,
      pushEnabled: false,
    });
    mockStorageWrapper.setItem.mockImplementation(async (key) => {
      if (key === BRAZE_PUSH_REGISTRATION_STATE) {
        throw new Error('Registration state write failed');
      }
    });

    await expect(migrate(state)).rejects.toThrow(
      'Failed to persist backfill value(s): Braze push registration state',
    );
  });
});
