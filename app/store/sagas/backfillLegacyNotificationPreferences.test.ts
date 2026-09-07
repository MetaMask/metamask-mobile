import { expectSaga } from 'redux-saga-test-plan';
import { UserActionType } from '../../actions/user';
import {
  HAS_USER_TURNED_OFF_ONCE_NOTIFICATIONS,
  LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
} from '../../constants/storage';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import initialRootState from '../../util/test/initial-root-state';
import StorageWrapper from '../storage-wrapper';
import { backfillLegacyNotificationPreferencesSaga } from './backfillLegacyNotificationPreferences';

jest.mock('../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NotificationServicesController: {
        createOnChainTriggers: jest.fn(),
      },
    },
  },
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('../storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(undefined),
    getItemSync: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockCreateOnChainTriggers = jest.mocked(
  Engine.context.NotificationServicesController.createOnChainTriggers,
);
const mockStorageWrapper = jest.mocked(StorageWrapper);
const loginAction = { type: UserActionType.LOGIN };

const createState = ({
  notificationsEnabled = true,
  marketingConsent = true,
  featureAnnouncementsEnabled = true,
}: {
  notificationsEnabled?: boolean;
  marketingConsent?: boolean;
  featureAnnouncementsEnabled?: boolean;
} = {}) => ({
  ...initialRootState,
  security: {
    ...initialRootState.security,
    dataCollectionForMarketing: marketingConsent,
  },
  engine: {
    ...initialRootState.engine,
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      NotificationServicesController: {
        ...initialRootState.engine.backgroundState
          .NotificationServicesController,
        isNotificationServicesEnabled: notificationsEnabled,
        isFeatureAnnouncementsEnabled: featureAnnouncementsEnabled,
      },
    },
  },
});

describe('backfillLegacyNotificationPreferencesSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageWrapper.getItemSync.mockImplementation((key) =>
      key === LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING ? 'true' : null,
    );
    mockStorageWrapper.removeItem.mockResolvedValue(undefined);
    mockCreateOnChainTriggers.mockResolvedValue(undefined);
  });

  it('does nothing when no AUS backfill marker exists', async () => {
    mockStorageWrapper.getItemSync.mockReturnValue(null);

    await expectSaga(backfillLegacyNotificationPreferencesSaga)
      .withState(createState())
      .dispatch(loginAction)
      .run();

    expect(mockCreateOnChainTriggers).not.toHaveBeenCalled();
    expect(mockStorageWrapper.removeItem).not.toHaveBeenCalled();
  });

  it('clears the marker when notifications and marketing consent are disabled', async () => {
    await expectSaga(backfillLegacyNotificationPreferencesSaga)
      .withState(
        createState({
          notificationsEnabled: false,
          marketingConsent: false,
        }),
      )
      .dispatch(loginAction)
      .run();

    expect(mockCreateOnChainTriggers).not.toHaveBeenCalled();
    expect(mockStorageWrapper.removeItem).toHaveBeenCalledWith(
      LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
    );
  });

  it('initializes preferences for a marketing-consented user with notifications disabled', async () => {
    await expectSaga(backfillLegacyNotificationPreferencesSaga)
      .withState(
        createState({
          notificationsEnabled: false,
          marketingConsent: true,
          featureAnnouncementsEnabled: false,
        }),
      )
      .dispatch(loginAction)
      .run();

    expect(mockCreateOnChainTriggers).toHaveBeenCalledWith({
      hasMarketingConsent: true,
      productAnnouncementEnabled: false,
      registerPushNotifications: false,
    });
    expect(mockStorageWrapper.removeItem).toHaveBeenCalledWith(
      LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
    );
  });

  it('does not override an explicit notification opt-out with marketing consent', async () => {
    mockStorageWrapper.getItemSync.mockImplementation((key) =>
      key === LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING ||
      key === HAS_USER_TURNED_OFF_ONCE_NOTIFICATIONS
        ? 'true'
        : null,
    );

    await expectSaga(backfillLegacyNotificationPreferencesSaga)
      .withState(
        createState({
          notificationsEnabled: false,
          marketingConsent: true,
        }),
      )
      .dispatch(loginAction)
      .run();

    expect(mockCreateOnChainTriggers).not.toHaveBeenCalled();
    expect(mockStorageWrapper.removeItem).toHaveBeenCalledWith(
      LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
    );
  });

  it('initializes missing preferences from current notification consent', async () => {
    await expectSaga(backfillLegacyNotificationPreferencesSaga)
      .withState(
        createState({
          marketingConsent: false,
          featureAnnouncementsEnabled: true,
        }),
      )
      .dispatch(loginAction)
      .run();

    expect(mockCreateOnChainTriggers).toHaveBeenCalledWith({
      hasMarketingConsent: false,
      productAnnouncementEnabled: true,
      registerPushNotifications: false,
    });
    expect(mockStorageWrapper.removeItem).toHaveBeenCalledWith(
      LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
    );
  });

  it('keeps the marker when preference initialization fails', async () => {
    const error = new Error('AUS request failed');
    mockCreateOnChainTriggers.mockRejectedValue(error);

    await expectSaga(backfillLegacyNotificationPreferencesSaga)
      .withState(createState())
      .dispatch(loginAction)
      .run();

    expect(mockStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'Failed to backfill legacy notification preferences',
    );
  });
});
