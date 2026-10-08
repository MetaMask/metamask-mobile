import StorageWrapper from '../../store/storage-wrapper';
import { FAILED_UNLOCK_ATTEMPTS } from '../../constants/storage';
import {
  getFailedUnlockAttempts,
  isUnlockLockedOut,
  MAX_FAILED_UNLOCK_ATTEMPTS,
  recordFailedUnlockAttempt,
  resetFailedUnlockAttempts,
} from './unlockAttempts';

jest.mock('../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockGetItem = StorageWrapper.getItem as jest.MockedFunction<
  typeof StorageWrapper.getItem
>;
const mockSetItem = StorageWrapper.setItem as jest.MockedFunction<
  typeof StorageWrapper.setItem
>;
const mockRemoveItem = StorageWrapper.removeItem as jest.MockedFunction<
  typeof StorageWrapper.removeItem
>;

describe('unlockAttempts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
  });

  it('returns 0 when no attempts are stored', async () => {
    const count = await getFailedUnlockAttempts();

    expect(count).toBe(0);
  });

  it('stores the next attempt count', async () => {
    mockGetItem.mockResolvedValue('2');

    const count = await recordFailedUnlockAttempt();

    expect(count).toBe(3);
    expect(mockSetItem).toHaveBeenCalledWith(FAILED_UNLOCK_ATTEMPTS, '3');
  });

  it('reports lockout once the maximum is reached', async () => {
    mockGetItem.mockResolvedValue(String(MAX_FAILED_UNLOCK_ATTEMPTS));

    const lockedOut = await isUnlockLockedOut();

    expect(lockedOut).toBe(true);
  });

  it('reports no lockout below the maximum', async () => {
    mockGetItem.mockResolvedValue(String(MAX_FAILED_UNLOCK_ATTEMPTS - 1));

    const lockedOut = await isUnlockLockedOut();

    expect(lockedOut).toBe(false);
  });

  it('clears the stored count', async () => {
    await resetFailedUnlockAttempts();

    expect(mockRemoveItem).toHaveBeenCalledWith(FAILED_UNLOCK_ATTEMPTS);
  });
});
