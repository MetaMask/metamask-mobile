import { getQRType } from './utils';
import { QRType } from './constants';
import Routes from '../../../constants/navigation/Routes';
import { PROTOCOLS } from '../../../constants/deeplinks';
import {
  MM_WALLETCONNECT_DEEPLINK,
  MM_SDK_DEEPLINK,
} from '../../../constants/urls';

// Mock external dependencies
jest.mock('../../../util/validators', () => ({
  failedSeedPhraseRequirements: jest.fn(),
  isValidMnemonic: jest.fn(),
}));

jest.mock('ethereumjs-util', () => ({
  isValidAddress: jest.fn(),
}));

jest.mock('../../../core/SDKConnectV2', () => ({
  __esModule: true,
  default: {
    isMwpDeeplink: jest.fn(),
  },
}));

jest.mock('../../../util/general', () => ({
  getURLProtocol: jest.fn(),
}));

import {
  failedSeedPhraseRequirements,
  isValidMnemonic,
} from '../../../util/validators';
import { isValidAddress } from 'ethereumjs-util';
import SDKConnectV2 from '../../../core/SDKConnectV2';
import { getURLProtocol } from '../../../util/general';

const mockIsValidMnemonic = isValidMnemonic as jest.MockedFunction<
  typeof isValidMnemonic
>;
const mockFailedSeedPhraseRequirements =
  failedSeedPhraseRequirements as jest.MockedFunction<
    typeof failedSeedPhraseRequirements
  >;
const mockIsValidAddress = isValidAddress as jest.MockedFunction<
  typeof isValidAddress
>;
const mockGetURLProtocol = getURLProtocol as jest.MockedFunction<
  typeof getURLProtocol
>;
const mockisMwpDeeplink = SDKConnectV2.isMwpDeeplink as jest.MockedFunction<
  typeof SDKConnectV2.isMwpDeeplink
>;

describe('getQRType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock return values
    mockIsValidMnemonic.mockReturnValue(false);
    mockFailedSeedPhraseRequirements.mockReturnValue(true);
    mockIsValidAddress.mockReturnValue(false);
    mockGetURLProtocol.mockReturnValue('');
    mockisMwpDeeplink.mockReturnValue(false);
  });

  describe('Seed Phrase Detection', () => {
    it('returns SEED_PHRASE when data.seed is present', () => {
      const content = 'any content';
      const data = { seed: 'word1 word2 word3...' };

      const result = getQRType(content, undefined, data);

      expect(result).toBe(QRType.SEED_PHRASE);
    });

    it('returns SEED_PHRASE when content is valid mnemonic', () => {
      mockFailedSeedPhraseRequirements.mockReturnValue(false);
      mockIsValidMnemonic.mockReturnValue(true);
      const content =
        'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';

      const result = getQRType(content);

      expect(result).toBe(QRType.SEED_PHRASE);
    });

    it('does not return SEED_PHRASE when seed phrase validation fails', () => {
      mockFailedSeedPhraseRequirements.mockReturnValue(true);
      mockIsValidMnemonic.mockReturnValue(false);
      const content = 'invalid seed phrase';

      const result = getQRType(content);

      expect(result).not.toBe(QRType.SEED_PHRASE);
    });
  });

  describe('Private Key Detection', () => {
    it('returns PRIVATE_KEY when data.private_key is present', () => {
      const content = 'any content';
      const data = { private_key: 'abc123...' };

      const result = getQRType(content, undefined, data);

      expect(result).toBe(QRType.PRIVATE_KEY);
    });

    it('returns PRIVATE_KEY when content is 64 characters', () => {
      const content = 'a'.repeat(64);

      const result = getQRType(content);

      expect(result).toBe(QRType.PRIVATE_KEY);
    });

    it('returns PRIVATE_KEY when content is 0x plus 64 characters', () => {
      const content = '0x' + 'a'.repeat(64);

      const result = getQRType(content);

      expect(result).toBe(QRType.PRIVATE_KEY);
    });

    it('returns PRIVATE_KEY when content is 0X plus 64 characters (uppercase)', () => {
      const content = '0X' + 'a'.repeat(64);

      const result = getQRType(content);

      expect(result).toBe(QRType.PRIVATE_KEY);
    });

    it('does not return PRIVATE_KEY when content length is incorrect', () => {
      const content = 'a'.repeat(63); // Wrong length

      const result = getQRType(content);

      expect(result).not.toBe(QRType.PRIVATE_KEY);
    });
  });

  describe('Send Flow Detection', () => {
    it('returns SEND_FLOW when origin is SEND_FLOW.SEND_TO', () => {
      const content = 'any content';

      const result = getQRType(content, Routes.SEND_FLOW.SEND_TO);

      expect(result).toBe(QRType.SEND_FLOW);
    });

    it('returns SEND_FLOW when origin is SETTINGS.CONTACT_FORM', () => {
      const content = 'any content';

      const result = getQRType(content, Routes.SETTINGS.CONTACT_FORM);

      expect(result).toBe(QRType.SEND_FLOW);
    });

    it('returns SEND_FLOW when data.action is send-eth', () => {
      const content = 'any content';
      const data = { action: 'send-eth' as const };

      const result = getQRType(content, undefined, data);

      expect(result).toBe(QRType.SEND_FLOW);
    });

    it('returns SEND_FLOW when content is valid ethereum address starting with 0x', () => {
      mockIsValidAddress.mockReturnValue(true);
      const content = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      const result = getQRType(content);

      expect(result).toBe(QRType.SEND_FLOW);
    });

    it('returns SEND_FLOW when content contains ethereum: protocol', () => {
      const content = `ethereum:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`;

      const result = getQRType(content);

      expect(result).toBe(QRType.SEND_FLOW);
    });

    it('does not return SEND_FLOW when address is invalid', () => {
      mockIsValidAddress.mockReturnValue(false);
      const content = '0xinvalid';

      const result = getQRType(content);

      expect(result).not.toBe(QRType.SEND_FLOW);
    });
  });

  describe('Wallet Connect Detection', () => {
    it('returns WALLET_CONNECT when data.walletConnectURI is present', () => {
      const content = 'any content';
      const data = { walletConnectURI: 'wc:...' };

      const result = getQRType(content, undefined, data);

      expect(result).toBe(QRType.WALLET_CONNECT);
    });

    it('returns WALLET_CONNECT when content starts with MM_WALLETCONNECT_DEEPLINK', () => {
      const content = `${MM_WALLETCONNECT_DEEPLINK}test`;

      const result = getQRType(content);

      expect(result).toBe(QRType.WALLET_CONNECT);
    });

    it('returns WALLET_CONNECT when content contains wc: protocol', () => {
      const content = 'wc:1234567890@1?bridge=https://bridge.walletconnect.org';

      const result = getQRType(content);

      expect(result).toBe(QRType.WALLET_CONNECT);
    });
  });

  describe('Deeplink Detection', () => {
    it('returns DEEPLINK when content starts with MM_SDK_DEEPLINK', () => {
      const content = `${MM_SDK_DEEPLINK}test`;

      const result = getQRType(content);

      expect(result).toBe(QRType.DEEPLINK);
    });

    it('returns DEEPLINK when content contains metamask-sync: protocol', () => {
      const content = 'metamask-sync:test-sync-link';

      const result = getQRType(content);

      expect(result).toBe(QRType.DEEPLINK);
    });

    it('returns DEEPLINK when SDKConnectV2.isMwpDeeplink returns true', () => {
      mockisMwpDeeplink.mockReturnValue(true);
      const content = 'metamask-sdk://connect';

      const result = getQRType(content);

      expect(result).toBe(QRType.DEEPLINK);
    });
  });

  describe('URL Detection', () => {
    it('returns URL when protocol is HTTP', () => {
      mockGetURLProtocol.mockReturnValue(PROTOCOLS.HTTP);
      const content = 'http://example.com';

      const result = getQRType(content);

      expect(result).toBe(QRType.URL);
    });

    it('returns URL when protocol is HTTPS', () => {
      mockGetURLProtocol.mockReturnValue(PROTOCOLS.HTTPS);
      const content = 'https://example.com';

      const result = getQRType(content);

      expect(result).toBe(QRType.URL);
    });

    it('returns URL when protocol is DAPP', () => {
      mockGetURLProtocol.mockReturnValue(PROTOCOLS.DAPP);
      const content = 'dapp://example.com';

      const result = getQRType(content);

      expect(result).toBe(QRType.URL);
    });
  });

  describe('Default Case', () => {
    it('returns DEEPLINK as default for arbitrary data (EIP-945)', () => {
      const content = 'arbitrary-unknown-content';

      const result = getQRType(content);

      expect(result).toBe(QRType.DEEPLINK);
    });

    it('returns DEEPLINK when no specific pattern matches', () => {
      const content = 'random-string-123';

      const result = getQRType(content);

      expect(result).toBe(QRType.DEEPLINK);
    });
  });

  describe('Priority Order', () => {
    it('prioritizes SEED_PHRASE over PRIVATE_KEY when both could match', () => {
      mockFailedSeedPhraseRequirements.mockReturnValue(false);
      mockIsValidMnemonic.mockReturnValue(true);
      // Content that could be interpreted as private key (64 chars) but is seed phrase
      const content =
        'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';

      const result = getQRType(content);

      expect(result).toBe(QRType.SEED_PHRASE);
    });

    it('prioritizes PRIVATE_KEY over SEND_FLOW when content is 0x + 64 chars', () => {
      mockIsValidAddress.mockReturnValue(true);
      const content = '0x' + 'a'.repeat(64);

      const result = getQRType(content);

      expect(result).toBe(QRType.PRIVATE_KEY);
    });

    it('prioritizes SEND_FLOW over WALLET_CONNECT when in send flow context', () => {
      const content = 'wc:could-be-walletconnect';

      const result = getQRType(content, Routes.SEND_FLOW.SEND_TO);

      expect(result).toBe(QRType.SEND_FLOW);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string content', () => {
      const content = '';

      const result = getQRType(content);

      expect(result).toBe(QRType.DEEPLINK);
    });

    it('handles content with special characters', () => {
      const content = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      const result = getQRType(content);

      expect(result).toBe(QRType.DEEPLINK);
    });

    it('handles content with whitespace', () => {
      const content = '   spaces   ';

      const result = getQRType(content);

      expect(result).toBe(QRType.DEEPLINK);
    });

    it('handles undefined origin parameter', () => {
      const content = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      mockIsValidAddress.mockReturnValue(true);

      const result = getQRType(content, undefined);

      expect(result).toBe(QRType.SEND_FLOW);
    });

    it('handles undefined data parameter', () => {
      const content = '0x' + 'a'.repeat(64);

      const result = getQRType(content, undefined, undefined);

      expect(result).toBe(QRType.PRIVATE_KEY);
    });
  });
});
