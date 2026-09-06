import { scanUnvalidatedSignatureAddresses } from './scan-unvalidated-signature';

const MALICIOUS_ADDRESS = '0x0000000000000000000000000000000000000bad';
const SIGNER_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const CHAIN_ID = '0x1';

const TYPED_DATA_V4 = {
  types: {
    Transfer: [{ name: 'recipient', type: 'address' }],
  },
  primaryType: 'Transfer',
  message: { recipient: MALICIOUS_ADDRESS },
};

jest.mock('../../util/blockaid', () => ({
  isBlockaidPreferenceEnabled: jest.fn(),
}));

jest.mock('./address-scan-util', () => ({
  parseTypedDataMessage: jest.fn(),
  scanAddress: jest.fn(),
}));

const mockIsBlockaidPreferenceEnabled = jest.requireMock(
  '../../util/blockaid',
).isBlockaidPreferenceEnabled;

const mockParseTypedDataMessage = jest.requireMock(
  './address-scan-util',
).parseTypedDataMessage;

const mockScanAddress = jest.requireMock('./address-scan-util').scanAddress;

describe('scanUnvalidatedSignatureAddresses (mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBlockaidPreferenceEnabled.mockReturnValue(true);
    mockParseTypedDataMessage.mockReturnValue(TYPED_DATA_V4);
  });

  const makeRequest = (
    method: string,
    signer: string,
    data: unknown,
  ): { method: string; params: unknown[] } => ({
    method,
    params: [signer, typeof data === 'string' ? data : JSON.stringify(data)],
  });

  it('scans extracted address fields for v4 typed data', () => {
    const phishingController = {} as never;
    scanUnvalidatedSignatureAddresses({
      request: makeRequest(
        'eth_signTypedData_v4',
        SIGNER_ADDRESS,
        TYPED_DATA_V4,
      ),
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(mockScanAddress).toHaveBeenCalledWith(
      phishingController,
      CHAIN_ID,
      MALICIOUS_ADDRESS,
    );
  });

  it('scans extracted address fields for v3 typed data', () => {
    const phishingController = {} as never;
    scanUnvalidatedSignatureAddresses({
      request: makeRequest(
        'eth_signTypedData_v3',
        SIGNER_ADDRESS,
        TYPED_DATA_V4,
      ),
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(mockScanAddress).toHaveBeenCalledWith(
      phishingController,
      CHAIN_ID,
      MALICIOUS_ADDRESS,
    );
  });

  it('does nothing for non-typed-data methods', () => {
    scanUnvalidatedSignatureAddresses({
      request: {
        method: 'personal_sign',
        params: [SIGNER_ADDRESS, '0xdeadbeef'],
      },
      chainId: CHAIN_ID,
      phishingController: {} as never,
    });

    expect(mockScanAddress).not.toHaveBeenCalled();
  });

  it('does nothing for v1 typed data method', () => {
    scanUnvalidatedSignatureAddresses({
      request: { method: 'eth_signTypedData', params: [SIGNER_ADDRESS, '{}'] },
      chainId: CHAIN_ID,
      phishingController: {} as never,
    });

    expect(mockScanAddress).not.toHaveBeenCalled();
  });

  it('does nothing when Blockaid preference is disabled', () => {
    mockIsBlockaidPreferenceEnabled.mockReturnValue(false);

    scanUnvalidatedSignatureAddresses({
      request: makeRequest(
        'eth_signTypedData_v4',
        SIGNER_ADDRESS,
        TYPED_DATA_V4,
      ),
      chainId: CHAIN_ID,
      phishingController: {} as never,
    });

    expect(mockScanAddress).not.toHaveBeenCalled();
  });

  it('does nothing when params are missing', () => {
    scanUnvalidatedSignatureAddresses({
      request: { method: 'eth_signTypedData_v4' },
      chainId: CHAIN_ID,
      phishingController: {} as never,
    });

    expect(mockScanAddress).not.toHaveBeenCalled();
  });

  it('does nothing when parseTypedDataMessage returns null', () => {
    mockParseTypedDataMessage.mockReturnValue(null);

    scanUnvalidatedSignatureAddresses({
      request: makeRequest(
        'eth_signTypedData_v4',
        SIGNER_ADDRESS,
        TYPED_DATA_V4,
      ),
      chainId: CHAIN_ID,
      phishingController: {} as never,
    });

    expect(mockScanAddress).not.toHaveBeenCalled();
  });

  it('excludes the signer address', () => {
    mockParseTypedDataMessage.mockReturnValue({
      types: { T: [{ name: 'addr', type: 'address' }] },
      primaryType: 'T',
      message: { addr: SIGNER_ADDRESS },
    });

    scanUnvalidatedSignatureAddresses({
      request: makeRequest('eth_signTypedData_v4', SIGNER_ADDRESS, {}),
      chainId: CHAIN_ID,
      phishingController: {} as never,
    });

    expect(mockScanAddress).not.toHaveBeenCalled();
  });

  it('accepts typed data as an object in params[1]', () => {
    const phishingController = {} as never;
    scanUnvalidatedSignatureAddresses({
      request: {
        method: 'eth_signTypedData_v4',
        params: [SIGNER_ADDRESS, TYPED_DATA_V4],
      },
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(mockScanAddress).toHaveBeenCalledWith(
      phishingController,
      CHAIN_ID,
      MALICIOUS_ADDRESS,
    );
  });

  it('scans multiple addresses from nested message types', () => {
    const addr1 = '0x0000000000000000000000000000000000000001';
    const addr2 = '0x0000000000000000000000000000000000000002';
    mockParseTypedDataMessage.mockReturnValue({
      types: {
        Pair: [
          { name: 'a', type: 'address' },
          { name: 'b', type: 'address' },
        ],
      },
      primaryType: 'Pair',
      message: { a: addr1, b: addr2 },
    });

    const phishingController = {} as never;
    scanUnvalidatedSignatureAddresses({
      request: makeRequest('eth_signTypedData_v4', SIGNER_ADDRESS, {}),
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(mockScanAddress).toHaveBeenCalledTimes(2);
    expect(mockScanAddress).toHaveBeenCalledWith(
      phishingController,
      CHAIN_ID,
      addr1,
    );
    expect(mockScanAddress).toHaveBeenCalledWith(
      phishingController,
      CHAIN_ID,
      addr2,
    );
  });
});
