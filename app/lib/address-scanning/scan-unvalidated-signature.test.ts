import type { PhishingController } from '@metamask/phishing-controller';
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

const mockIsBlockaidPreferenceEnabled = jest.requireMock(
  '../../util/blockaid',
).isBlockaidPreferenceEnabled;

const makePhishingController = () =>
  ({
    scanAddress: jest.fn().mockResolvedValue(undefined),
  }) as unknown as PhishingController & {
    scanAddress: jest.Mock;
  };

describe('scanUnvalidatedSignatureAddresses (mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBlockaidPreferenceEnabled.mockReturnValue(true);
  });

  const makeRequest = (
    method: string,
    signer: string,
    data: unknown,
  ): { method: string; params: unknown[] } => ({
    method,
    params: [signer, typeof data === 'string' ? data : JSON.stringify(data)],
  });

  it('scans extracted address fields for v4 typed data', async () => {
    const phishingController = makePhishingController();
    scanUnvalidatedSignatureAddresses({
      request: makeRequest(
        'eth_signTypedData_v4',
        SIGNER_ADDRESS,
        TYPED_DATA_V4,
      ),
      chainId: CHAIN_ID,
      phishingController,
    });

    await Promise.resolve();

    expect(phishingController.scanAddress).toHaveBeenCalledWith(
      CHAIN_ID,
      MALICIOUS_ADDRESS,
    );
  });

  it('scans extracted address fields for v3 typed data', async () => {
    const phishingController = makePhishingController();
    scanUnvalidatedSignatureAddresses({
      request: makeRequest(
        'eth_signTypedData_v3',
        SIGNER_ADDRESS,
        TYPED_DATA_V4,
      ),
      chainId: CHAIN_ID,
      phishingController,
    });

    await Promise.resolve();

    expect(phishingController.scanAddress).toHaveBeenCalledWith(
      CHAIN_ID,
      MALICIOUS_ADDRESS,
    );
  });

  it('does nothing for non-typed-data methods', () => {
    const phishingController = makePhishingController();
    scanUnvalidatedSignatureAddresses({
      request: {
        method: 'personal_sign',
        params: [SIGNER_ADDRESS, '0xdeadbeef'],
      },
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(phishingController.scanAddress).not.toHaveBeenCalled();
  });

  it('does nothing for v1 typed data method', () => {
    const phishingController = makePhishingController();
    scanUnvalidatedSignatureAddresses({
      request: { method: 'eth_signTypedData', params: [SIGNER_ADDRESS, '{}'] },
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(phishingController.scanAddress).not.toHaveBeenCalled();
  });

  it('does nothing when Blockaid preference is disabled', () => {
    mockIsBlockaidPreferenceEnabled.mockReturnValue(false);
    const phishingController = makePhishingController();

    scanUnvalidatedSignatureAddresses({
      request: makeRequest(
        'eth_signTypedData_v4',
        SIGNER_ADDRESS,
        TYPED_DATA_V4,
      ),
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(phishingController.scanAddress).not.toHaveBeenCalled();
  });

  it('does nothing when params are missing', () => {
    const phishingController = makePhishingController();
    scanUnvalidatedSignatureAddresses({
      request: { method: 'eth_signTypedData_v4' },
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(phishingController.scanAddress).not.toHaveBeenCalled();
  });

  it('does nothing when typed data cannot be parsed', () => {
    const phishingController = makePhishingController();
    scanUnvalidatedSignatureAddresses({
      request: {
        method: 'eth_signTypedData_v4',
        params: [SIGNER_ADDRESS, 'not-valid-json{'],
      },
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(phishingController.scanAddress).not.toHaveBeenCalled();
  });

  it('excludes the signer address', async () => {
    const phishingController = makePhishingController();
    scanUnvalidatedSignatureAddresses({
      request: makeRequest('eth_signTypedData_v4', SIGNER_ADDRESS, {
        types: { T: [{ name: 'addr', type: 'address' }] },
        primaryType: 'T',
        message: { addr: SIGNER_ADDRESS },
      }),
      chainId: CHAIN_ID,
      phishingController,
    });

    await Promise.resolve();

    expect(phishingController.scanAddress).not.toHaveBeenCalled();
  });

  it('accepts typed data as an object in params[1]', async () => {
    const phishingController = makePhishingController();
    scanUnvalidatedSignatureAddresses({
      request: {
        method: 'eth_signTypedData_v4',
        params: [SIGNER_ADDRESS, TYPED_DATA_V4],
      },
      chainId: CHAIN_ID,
      phishingController,
    });

    await Promise.resolve();

    expect(phishingController.scanAddress).toHaveBeenCalledWith(
      CHAIN_ID,
      MALICIOUS_ADDRESS,
    );
  });

  it('scans multiple addresses from nested message types', async () => {
    const addr1 = '0x0000000000000000000000000000000000000001';
    const addr2 = '0x0000000000000000000000000000000000000002';
    const phishingController = makePhishingController();

    scanUnvalidatedSignatureAddresses({
      request: makeRequest('eth_signTypedData_v4', SIGNER_ADDRESS, {
        types: {
          Pair: [
            { name: 'a', type: 'address' },
            { name: 'b', type: 'address' },
          ],
        },
        primaryType: 'Pair',
        message: { a: addr1, b: addr2 },
      }),
      chainId: CHAIN_ID,
      phishingController,
    });

    await Promise.resolve();

    expect(phishingController.scanAddress).toHaveBeenCalledTimes(2);
    expect(phishingController.scanAddress).toHaveBeenCalledWith(
      CHAIN_ID,
      addr1,
    );
    expect(phishingController.scanAddress).toHaveBeenCalledWith(
      CHAIN_ID,
      addr2,
    );
  });

  it('scans up to the 50-address ceiling', async () => {
    const message: Record<string, string> = {};
    const fields: { name: string; type: string }[] = [];
    for (let index = 1; index <= 12; index += 1) {
      const name = `recipient${index}`;
      message[name] = `0x${index.toString(16).padStart(40, '0')}`;
      fields.push({ name, type: 'address' });
    }
    const phishingController = makePhishingController();

    scanUnvalidatedSignatureAddresses({
      request: makeRequest('eth_signTypedData_v4', SIGNER_ADDRESS, {
        types: { Transfer: fields },
        primaryType: 'Transfer',
        message,
      }),
      chainId: CHAIN_ID,
      phishingController,
    });

    await Promise.resolve();

    expect(phishingController.scanAddress).toHaveBeenCalledTimes(12);
  });
});
