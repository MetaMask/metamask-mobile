import { captureException } from '@sentry/react-native';
import { BRAZE_PUSH_REGISTRATION_STATE } from '../../constants/storage';
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
}: {
  notificationsEnabled?: boolean;
  pushEnabled?: boolean;
}) => ({
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

describe(`Migration ${migrationVersion}: schedule Braze push registration reconciliation`, () => {
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

  it('marks devices with both notification switches enabled as registered', async () => {
    const state = createState({
      notificationsEnabled: true,
      pushEnabled: true,
    });

    await migrate(state);

    expect(mockStorageWrapper.setItem).toHaveBeenCalledTimes(1);
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

  it('conservatively marks devices with missing notification state for Braze unregistration', async () => {
    const state = createState({});

    await migrate(state);

    expect(mockStorageWrapper.setItem).toHaveBeenCalledTimes(1);
    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      BRAZE_PUSH_REGISTRATION_STATE,
      'unregistration-pending',
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
