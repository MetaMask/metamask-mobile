import StorageWrapper from '../../../../../store/storage-wrapper';
import Logger from '../../../../../util/Logger';
import { getVbaOnboardingResumeState } from './routes';
import { getVbaWalletAddress } from './vbaWalletAddress';
import {
  VBA_KYC_MAX_CONSECUTIVE_RESUMES,
  VBA_KYC_RELAUNCH_WINDOW_MS,
  clearVbaKycRelaunchMarker,
  consumeVbaKycResumeState,
  markVbaKycRelaunch,
} from './vbaKycRelaunchMarker';

jest.mock('../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('./vbaWalletAddress', () => ({
  getVbaWalletAddress: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const MARKER_KEY = '@MetaMask:vbaKycRelaunchMarker:v1';
const RESUMES_KEY = '@MetaMask:vbaKycRelaunchResumes:v1';
const NOW = 1_800_000_000_000;

const mockStorage = jest.mocked(StorageWrapper);
const mockGetWallet = jest.mocked(getVbaWalletAddress);
let mockStore: Record<string, string>;

const previousRuntimeMarker = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    walletAddress: '0xabc',
    runtimeId: 'previous-runtime',
    updatedAt: NOW - 30_000,
    ...overrides,
  });

const readJson = (key: string) =>
  mockStore[key] === undefined ? undefined : JSON.parse(mockStore[key]);

describe('vbaKycRelaunchMarker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    mockStore = {};
    mockGetWallet.mockReturnValue('0xAbC');
    mockStorage.getItem.mockImplementation(async (key: string) =>
      key in mockStore ? mockStore[key] : null,
    );
    mockStorage.setItem.mockImplementation(
      async (key: string, value: string) => {
        mockStore[key] = value;
      },
    );
    mockStorage.removeItem.mockImplementation(async (key: string) => {
      delete mockStore[key];
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('markVbaKycRelaunch', () => {
    it('stores the normalized wallet and the current time', async () => {
      await markVbaKycRelaunch();

      expect(readJson(MARKER_KEY)).toStrictEqual({
        walletAddress: '0xabc',
        runtimeId: expect.any(String),
        updatedAt: NOW,
      });
    });

    it('skips the write without a selected wallet', async () => {
      mockGetWallet.mockReturnValue(null);

      await markVbaKycRelaunch();

      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it('logs instead of throwing when storage fails', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('disk full'));

      await expect(markVbaKycRelaunch()).resolves.toBeUndefined();
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('clearVbaKycRelaunchMarker', () => {
    it('removes the marker and the resume count', async () => {
      mockStore[MARKER_KEY] = previousRuntimeMarker();
      mockStore[RESUMES_KEY] = JSON.stringify({ count: 2, lastAt: NOW });

      await clearVbaKycRelaunchMarker();

      expect(mockStore).toStrictEqual({});
    });
  });

  describe('consumeVbaKycResumeState', () => {
    it('returns nothing when no marker exists', async () => {
      await expect(consumeVbaKycResumeState()).resolves.toBeUndefined();
      expect(mockStorage.removeItem).not.toHaveBeenCalled();
    });

    it('returns the onboarding resume state for a recent marker from a previous runtime', async () => {
      mockStore[MARKER_KEY] = previousRuntimeMarker();

      await expect(consumeVbaKycResumeState()).resolves.toStrictEqual(
        getVbaOnboardingResumeState('vba-kyc-relaunch'),
      );
      expect(mockStore[MARKER_KEY]).toBeUndefined();
      expect(readJson(RESUMES_KEY)).toStrictEqual({ count: 1, lastAt: NOW });
    });

    it('resumes at the edge of the window', async () => {
      mockStore[MARKER_KEY] = previousRuntimeMarker({
        updatedAt: NOW - VBA_KYC_RELAUNCH_WINDOW_MS,
      });

      await expect(consumeVbaKycResumeState()).resolves.toBeDefined();
    });

    it.each([
      [
        'older than the window',
        { updatedAt: NOW - VBA_KYC_RELAUNCH_WINDOW_MS - 1 },
      ],
      ['stamped in the future', { updatedAt: NOW + 1 }],
      ['for another wallet', { walletAddress: '0xdef' }],
    ])('deletes a marker %s without resuming', async (_label, overrides) => {
      mockStore[MARKER_KEY] = previousRuntimeMarker(overrides);

      await expect(consumeVbaKycResumeState()).resolves.toBeUndefined();
      expect(mockStore[MARKER_KEY]).toBeUndefined();
      expect(mockStore[RESUMES_KEY]).toBeUndefined();
    });

    it('deletes a malformed marker without resuming', async () => {
      mockStore[MARKER_KEY] = 'not-json';

      await expect(consumeVbaKycResumeState()).resolves.toBeUndefined();
      expect(mockStore[MARKER_KEY]).toBeUndefined();
    });

    it('leaves a marker from the current runtime in place', async () => {
      await markVbaKycRelaunch();

      await expect(consumeVbaKycResumeState()).resolves.toBeUndefined();
      expect(mockStore[MARKER_KEY]).toBeDefined();
    });

    it('allows another resume in a row below the cap', async () => {
      mockStore[MARKER_KEY] = previousRuntimeMarker();
      mockStore[RESUMES_KEY] = JSON.stringify({
        count: VBA_KYC_MAX_CONSECUTIVE_RESUMES - 1,
        lastAt: NOW - 60_000,
      });

      await expect(consumeVbaKycResumeState()).resolves.toBeDefined();
      expect(readJson(RESUMES_KEY)).toStrictEqual({
        count: VBA_KYC_MAX_CONSECUTIVE_RESUMES,
        lastAt: NOW,
      });
    });

    it('goes home once the resumes in a row reach the cap', async () => {
      const resumes = JSON.stringify({
        count: VBA_KYC_MAX_CONSECUTIVE_RESUMES,
        lastAt: NOW - 10_000,
      });
      mockStore[MARKER_KEY] = previousRuntimeMarker();
      mockStore[RESUMES_KEY] = resumes;

      await expect(consumeVbaKycResumeState()).resolves.toBeUndefined();
      expect(mockStore[MARKER_KEY]).toBeUndefined();
      expect(mockStore[RESUMES_KEY]).toBe(resumes);
    });

    it('starts counting again once the last resume is outside the window', async () => {
      mockStore[MARKER_KEY] = previousRuntimeMarker();
      mockStore[RESUMES_KEY] = JSON.stringify({
        count: VBA_KYC_MAX_CONSECUTIVE_RESUMES,
        lastAt: NOW - VBA_KYC_RELAUNCH_WINDOW_MS - 1,
      });

      await expect(consumeVbaKycResumeState()).resolves.toBeDefined();
      expect(readJson(RESUMES_KEY)).toStrictEqual({ count: 1, lastAt: NOW });
    });

    it('logs and skips the resume when storage fails', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('read failed'));

      await expect(consumeVbaKycResumeState()).resolves.toBeUndefined();
      expect(Logger.error).toHaveBeenCalled();
    });
  });
});
