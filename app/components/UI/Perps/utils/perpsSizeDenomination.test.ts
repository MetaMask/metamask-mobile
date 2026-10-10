import { PERPS_SIZE_DENOMINATION } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  clearPerpsSizeDenominationMemoryForTests,
  readPerpsSizeDenomination,
  resetPerpsSizeDenominationForTests,
  toPerpsSizeUnitAnalyticsValue,
  writePerpsSizeDenomination,
} from './perpsSizeDenomination';

const mockStorage = new Map<string, string>();

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn((key: string) => mockStorage.get(key) ?? null),
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
  },
}));

describe('perpsSizeDenomination', () => {
  beforeEach(() => {
    resetPerpsSizeDenominationForTests();
  });

  it('defaults to USD', () => {
    expect(readPerpsSizeDenomination()).toBe('usd');
    expect(toPerpsSizeUnitAnalyticsValue('usd')).toBe('usd');
  });

  it('keeps coin in memory for the next read', () => {
    writePerpsSizeDenomination('asset');

    expect(readPerpsSizeDenomination()).toBe('asset');
    expect(toPerpsSizeUnitAnalyticsValue('asset')).toBe('coin');
  });

  it('restores coin from storage after the in-memory value is dropped', async () => {
    writePerpsSizeDenomination('asset');

    await expect(StorageWrapper.getItem(PERPS_SIZE_DENOMINATION)).resolves.toBe(
      'asset',
    );

    clearPerpsSizeDenominationMemoryForTests();

    expect(readPerpsSizeDenomination()).toBe('asset');
  });
});
