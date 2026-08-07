import type { PhishingController } from '@metamask/phishing-controller';
import { isBlockaidPreferenceEnabled } from '../../util/blockaid';
import { scanAddress } from './address-scan-util';
import { scanUnvalidatedSignatureAddresses } from './scan-unvalidated-signature';

jest.mock('../../util/blockaid', () => ({
  isBlockaidPreferenceEnabled: jest.fn(() => true),
}));

jest.mock('./address-scan-util', () => ({
  parseTypedDataMessage: jest.fn((data: string | object) =>
    JSON.parse(typeof data === 'string' ? data : JSON.stringify(data)),
  ),
  scanAddress: jest.fn(),
}));

const SIGNER = '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477';
const RECIPIENT = '0x1111111111111111111111111111111111111111';
const MAKER = '0x2222222222222222222222222222222222222222';
const CHAIN_ID = '0x1';

const phishingController = {} as PhishingController;

const mockScanAddress = jest.mocked(scanAddress);
const mockIsEnabled = jest.mocked(isBlockaidPreferenceEnabled);

function claimOrder(message: Record<string, unknown>) {
  return JSON.stringify({
    types: {
      ClaimOrder: [
        { name: 'recipient', type: 'address' },
        { name: 'maker', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
    },
    primaryType: 'ClaimOrder',
    domain: { verifyingContract: '0xcccccccccccccccccccccccccccccccccccccccc' },
    message,
  });
}

describe('scanUnvalidatedSignatureAddresses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled.mockReturnValue(true);
  });

  it('scans an address field embedded in an unrecognized typed-data message', () => {
    scanUnvalidatedSignatureAddresses({
      request: {
        method: 'eth_signTypedData_v4',
        params: [SIGNER, claimOrder({ recipient: RECIPIENT, amount: '1' })],
      },
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(mockScanAddress).toHaveBeenCalledTimes(1);
    expect(mockScanAddress).toHaveBeenCalledWith(
      phishingController,
      CHAIN_ID,
      RECIPIENT,
    );
  });

  it('scans multiple address fields and excludes the signer', () => {
    scanUnvalidatedSignatureAddresses({
      request: {
        method: 'eth_signTypedData_v4',
        params: [
          SIGNER,
          claimOrder({ recipient: RECIPIENT, maker: MAKER, amount: '1' }),
        ],
      },
      chainId: CHAIN_ID,
      phishingController,
    });

    const scanned = mockScanAddress.mock.calls.map((call) => call[2]);
    expect(scanned).toStrictEqual([RECIPIENT, MAKER]);
  });

  it('does not scan the signer address', () => {
    scanUnvalidatedSignatureAddresses({
      request: {
        method: 'eth_signTypedData_v4',
        params: [SIGNER, claimOrder({ recipient: SIGNER, maker: MAKER })],
      },
      chainId: CHAIN_ID,
      phishingController,
    });

    const scanned = mockScanAddress.mock.calls.map((call) => call[2]);
    expect(scanned).toStrictEqual([MAKER]);
  });

  it('ignores methods other than signTypedData v3/v4', () => {
    scanUnvalidatedSignatureAddresses({
      request: {
        method: 'personal_sign',
        params: [SIGNER, claimOrder({ recipient: RECIPIENT })],
      },
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(mockScanAddress).not.toHaveBeenCalled();
  });

  it('does not scan when security alerts are disabled', () => {
    mockIsEnabled.mockReturnValue(false);

    scanUnvalidatedSignatureAddresses({
      request: {
        method: 'eth_signTypedData_v4',
        params: [SIGNER, claimOrder({ recipient: RECIPIENT })],
      },
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(mockScanAddress).not.toHaveBeenCalled();
  });

  it('does nothing when the typed data param is missing', () => {
    scanUnvalidatedSignatureAddresses({
      request: { method: 'eth_signTypedData_v4', params: [SIGNER] },
      chainId: CHAIN_ID,
      phishingController,
    });

    expect(mockScanAddress).not.toHaveBeenCalled();
  });
});
