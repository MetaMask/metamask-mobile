import StorageWrapper from '../../../../../store/storage-wrapper';
import {
  getVbaVendorTermsAcceptance,
  hasAcceptedVbaVendorTerms,
  saveVbaVendorTermsAcceptance,
} from './vbaVendorTermsStorage';

jest.mock('../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const mockStorage = jest.mocked(StorageWrapper);

describe('VBA vendor terms storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
  });

  it('stores accepted disclaimer ids under a normalized wallet key', async () => {
    await saveVbaVendorTermsAcceptance('0xAbC', ['privacy', 'terms']);

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      '@MetaMask:vbaTermsOneAccepted:v1:0xabc',
      '{"disclaimerIds":["privacy","terms"]}',
    );
  });

  it('reads a valid acceptance', async () => {
    mockStorage.getItem.mockResolvedValue(
      '{"disclaimerIds":["privacy","terms"]}',
    );

    await expect(getVbaVendorTermsAcceptance('0xAbC')).resolves.toStrictEqual({
      disclaimerIds: ['privacy', 'terms'],
    });
    await expect(hasAcceptedVbaVendorTerms('0xAbC')).resolves.toBe(true);
  });

  it('ignores malformed acceptance data', async () => {
    mockStorage.getItem.mockResolvedValue('not-json');

    await expect(getVbaVendorTermsAcceptance('0xabc')).resolves.toBeNull();
    await expect(hasAcceptedVbaVendorTerms('0xabc')).resolves.toBe(false);
  });
});
