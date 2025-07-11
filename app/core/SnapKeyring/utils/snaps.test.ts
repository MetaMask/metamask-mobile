import { SnapId } from '@metamask/snaps-sdk';
import { SnapKeyringBuilderMessenger } from '../types';
import {
  isSnapPreinstalled,
  isMultichainWalletSnap,
  getSnapName,
} from './snaps';
import {
  stripSnapPrefix,
  getLocalizedSnapManifest,
} from '@metamask/snaps-utils';

// Mock the Bitcoin and Solana wallet snap IDs
const MOCK_BITCOIN_WALLET_SNAP_ID =
  'npm:@metamask/bitcoin-wallet-snap' as SnapId;
const MOCK_SOLANA_WALLET_SNAP_ID = 'npm:@metamask/solana-wallet-snap' as SnapId;

// Mock dependencies
jest.mock('../../../lib/snaps/preinstalled-snaps', () => ({
  __esModule: true,
  default: [
    { snapId: 'npm:@metamask/test-snap-1' },
    { snapId: 'npm:@metamask/test-snap-2' },
  ],
}));

// Mock the Engine
jest.mock('../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

// Mock the BitcoinWalletSnap module
jest.mock('../BitcoinWalletSnap', () => ({
  BITCOIN_WALLET_SNAP_ID: 'npm:@metamask/bitcoin-wallet-snap',
}));

// Mock the SolanaWalletSnap module
jest.mock('../SolanaWalletSnap', () => ({
  SOLANA_WALLET_SNAP_ID: 'npm:@metamask/solana-wallet-snap',
}));

jest.mock('@metamask/snaps-utils', () => ({
  stripSnapPrefix: jest.fn((snapId) => snapId.replace('npm:', '')),
  getLocalizedSnapManifest: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  __esModule: true,
  default: {
    locale: 'en-US',
  },
}));

describe('snaps utility functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isSnapPreinstalled', () => {
    it('should return true for preinstalled snap', () => {
      const snapId = 'npm:@metamask/test-snap-1' as SnapId;
      expect(isSnapPreinstalled(snapId)).toBe(true);
    });

    it('should return false for non-preinstalled snap', () => {
      const snapId = 'npm:@metamask/non-preinstalled-snap' as SnapId;
      expect(isSnapPreinstalled(snapId)).toBe(false);
    });
  });

  describe('isMultichainWalletSnap', () => {
    it('should return true for Bitcoin wallet snap', () => {
      expect(isMultichainWalletSnap(MOCK_BITCOIN_WALLET_SNAP_ID)).toBe(true);
    });

    it('should return true for Solana wallet snap', () => {
      expect(isMultichainWalletSnap(MOCK_SOLANA_WALLET_SNAP_ID)).toBe(true);
    });

    it('should return false for non-multichain wallet snap', () => {
      const snapId = 'npm:@metamask/other-snap' as SnapId;
      expect(isMultichainWalletSnap(snapId)).toBe(false);
    });
  });

  describe('getSnapName', () => {
    // Create a proper mock for the messenger
    const mockCall = jest.fn();
    const mockMessenger = {
      call: mockCall,
    } as unknown as SnapKeyringBuilderMessenger;

    beforeEach(() => {
      mockCall.mockReset();
    });

    it('should return stripped snap id when snap is not found', () => {
      const snapId = 'npm:@metamask/not-found-snap' as SnapId;
      mockCall.mockReturnValue(null);

      const result = getSnapName(snapId, mockMessenger);

      expect(mockCall).toHaveBeenCalledWith('SnapController:get', snapId);
      expect(stripSnapPrefix).toHaveBeenCalledWith(snapId);
      expect(result).toBe('@metamask/not-found-snap');
    });

    it('should return proposedName when snap has no localization files', () => {
      const snapId = 'npm:@metamask/test-snap' as SnapId;
      const mockSnap = {
        manifest: {
          proposedName: 'Test Snap',
        },
      };
      mockCall.mockReturnValue(mockSnap);

      const result = getSnapName(snapId, mockMessenger);

      expect(mockCall).toHaveBeenCalledWith('SnapController:get', snapId);
      expect(result).toBe('Test Snap');
    });

    it('should return localized proposedName when snap has localization files', () => {
      const snapId = 'npm:@metamask/localized-snap' as SnapId;
      const mockSnap = {
        manifest: {
          proposedName: 'Original Name',
        },
        localizationFiles: {
          'en-US': { content: { proposedName: 'Localized Name' } },
        },
      };
      mockCall.mockReturnValue(mockSnap);

      (getLocalizedSnapManifest as jest.Mock).mockReturnValue({
        proposedName: 'Localized Name',
      });

      const result = getSnapName(snapId, mockMessenger);

      expect(mockCall).toHaveBeenCalledWith('SnapController:get', snapId);
      expect(getLocalizedSnapManifest).toHaveBeenCalledWith(
        mockSnap.manifest,
        'en-US',
        mockSnap.localizationFiles,
      );
      expect(result).toBe('Localized Name');
    });
  });
});
