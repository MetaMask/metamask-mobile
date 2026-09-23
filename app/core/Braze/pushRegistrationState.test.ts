import StorageWrapper from '../../store/storage-wrapper';
import {
  getBrazePushRegistrationState,
  hasPendingBrazePushUnregistrationSync,
  markBrazePushRegistrationDesired,
  markBrazePushUnregistrationPending,
  markBrazePushUnregistered,
} from './pushRegistrationState';
import { BRAZE_PUSH_REGISTRATION_STATE } from '../../constants/storage';

jest.mock('../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn(),
    setItem: jest.fn(),
  },
}));

const mockStorageWrapper = jest.mocked(StorageWrapper);

describe('Braze push registration state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('persists pending unregistration', async () => {
    await markBrazePushUnregistrationPending();

    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      BRAZE_PUSH_REGISTRATION_STATE,
      'unregistration-pending',
    );
  });

  it('persists confirmed unregistration', async () => {
    await markBrazePushUnregistered();

    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      BRAZE_PUSH_REGISTRATION_STATE,
      'unregistered',
    );
  });

  it('persists registration as the latest explicit desired state', async () => {
    await markBrazePushRegistrationDesired();

    expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
      BRAZE_PUSH_REGISTRATION_STATE,
      'registered',
    );
  });

  it('reads the persisted registration state', () => {
    mockStorageWrapper.getItemSync.mockReturnValue('unregistered');

    expect(getBrazePushRegistrationState()).toBe('unregistered');
  });

  it('reports only unconfirmed unregistration as pending', () => {
    mockStorageWrapper.getItemSync.mockReturnValue('unregistration-pending');

    expect(hasPendingBrazePushUnregistrationSync()).toBe(true);
    mockStorageWrapper.getItemSync.mockReturnValue('unregistered');
    expect(hasPendingBrazePushUnregistrationSync()).toBe(false);
  });
});
