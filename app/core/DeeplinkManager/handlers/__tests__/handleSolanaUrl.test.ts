import { Alert } from 'react-native';
import { SolScope } from '@metamask/keyring-api';

import handleSolanaUrl, {
  buildSolanaPayAsset,
  resolveSolanaPayTokenMeta,
} from '../handleSolanaUrl';
import {
  ChainType,
  handleSendPageNavigation,
} from '../../../../components/Views/confirmations/utils/send';
import { InitSendLocation } from '../../../../components/Views/confirmations/constants/send';
import NavigationService from '../../../NavigationService';
import { fetchAssetMetadata } from '../../../../components/UI/Bridge/hooks/useAssetMetadata/utils';

jest.mock('../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../components/Views/confirmations/utils/send', () => ({
  ChainType: {
    EVM: 'evm',
    SOLANA: 'solana',
    BITCOIN: 'bitcoin',
    TRON: 'tron',
    STELLAR: 'stellar',
  },
  handleSendPageNavigation: jest.fn(),
}));

jest.mock(
  '../../../../components/UI/Bridge/hooks/useAssetMetadata/utils',
  () => ({
    fetchAssetMetadata: jest.fn(),
  }),
);

const RECIPIENT = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const UNKNOWN_MINT = 'So11111111111111111111111111111111111111112';

describe('handleSolanaUrl', () => {
  const mockHandleSendPageNavigation = jest.mocked(handleSendPageNavigation);
  const mockFetchAssetMetadata = jest.mocked(fetchAssetMetadata);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockFetchAssetMetadata.mockResolvedValue({
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      image: 'https://example.com/usdc.png',
      assetId: `${SolScope.Mainnet}/token:${USDC_MINT}`,
      address: USDC_MINT,
      chainId: SolScope.Mainnet,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('navigates to send with recipient, USDC asset, and normalized amount', async () => {
    const url = `solana:${RECIPIENT}?amount=25.515000&spl-token=${USDC_MINT}`;

    await handleSolanaUrl({ url });

    expect(mockHandleSendPageNavigation).toHaveBeenCalledWith(
      NavigationService.navigation.navigate,
      {
        location: InitSendLocation.QRScanner,
        predefinedRecipient: {
          address: RECIPIENT,
          chainType: ChainType.SOLANA,
        },
        asset: buildSolanaPayAsset(USDC_MINT, {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          image: 'https://example.com/usdc.png',
        }),
        predefinedAmount: '25.515',
      },
    );
  });

  it('navigates to send with native SOL when spl-token is omitted', async () => {
    const url = `solana:${RECIPIENT}?amount=1.5`;

    await handleSolanaUrl({ url });

    expect(mockHandleSendPageNavigation).toHaveBeenCalledWith(
      NavigationService.navigation.navigate,
      {
        location: InitSendLocation.QRScanner,
        predefinedRecipient: {
          address: RECIPIENT,
          chainType: ChainType.SOLANA,
        },
        asset: buildSolanaPayAsset(),
        predefinedAmount: '1.5',
      },
    );
    expect(buildSolanaPayAsset().address).toBe(
      `${SolScope.Mainnet}/slip44:501`,
    );
  });

  it('alerts when the URI is not a Solana Pay transfer or transaction request', async () => {
    await handleSolanaUrl({ url: 'solana:not-an-address' });

    expect(Alert.alert).toHaveBeenCalledWith('deeplink.invalid');
    expect(mockHandleSendPageNavigation).not.toHaveBeenCalled();
  });

  it('alerts when the amount is malformed', async () => {
    await handleSolanaUrl({ url: `solana:${RECIPIENT}?amount=1e5` });

    expect(Alert.alert).toHaveBeenCalledWith('deeplink.invalid');
    expect(mockHandleSendPageNavigation).not.toHaveBeenCalled();
  });

  it('alerts when the amount has more decimals than the asset supports', async () => {
    await handleSolanaUrl({
      url: `solana:${RECIPIENT}?amount=1.1234567&spl-token=${USDC_MINT}`,
    });

    expect(Alert.alert).toHaveBeenCalledWith('deeplink.invalid');
    expect(mockHandleSendPageNavigation).not.toHaveBeenCalled();
  });

  it('alerts when SPL token metadata cannot be resolved', async () => {
    mockFetchAssetMetadata.mockResolvedValue(undefined);

    await handleSolanaUrl({
      url: `solana:${RECIPIENT}?amount=1&spl-token=${UNKNOWN_MINT}`,
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'deeplink.invalid',
      'deeplink.solana_pay_token_not_supported',
    );
    expect(mockHandleSendPageNavigation).not.toHaveBeenCalled();
  });

  it('falls back to well-known USDC metadata when the token API fails', async () => {
    mockFetchAssetMetadata.mockResolvedValue(undefined);

    await handleSolanaUrl({
      url: `solana:${RECIPIENT}?amount=1&spl-token=${USDC_MINT}`,
    });

    expect(mockHandleSendPageNavigation).toHaveBeenCalledWith(
      NavigationService.navigation.navigate,
      expect.objectContaining({
        asset: buildSolanaPayAsset(USDC_MINT, {
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
        }),
        predefinedAmount: '1',
      }),
    );
  });

  it('alerts when the URI includes a Solana Pay reference', async () => {
    await handleSolanaUrl({
      url: `solana:${RECIPIENT}?amount=1&reference=${RECIPIENT}`,
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'deeplink.not_supported',
      'deeplink.solana_pay_reference_not_supported',
    );
    expect(mockHandleSendPageNavigation).not.toHaveBeenCalled();
  });

  it('alerts when the URI is a Solana Pay transaction request', async () => {
    await handleSolanaUrl({
      url: 'solana:https://api.triple-a.io/pay?id=abc',
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'deeplink.not_supported',
      'deeplink.solana_pay_transaction_request_not_supported',
    );
    expect(mockHandleSendPageNavigation).not.toHaveBeenCalled();
  });
});

describe('resolveSolanaPayTokenMeta', () => {
  const mockFetchAssetMetadata = jest.mocked(fetchAssetMetadata);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns metadata from the token API when available', async () => {
    mockFetchAssetMetadata.mockResolvedValue({
      symbol: 'BONK',
      name: 'Bonk',
      decimals: 5,
      image: 'https://example.com/bonk.png',
      assetId: `${SolScope.Mainnet}/token:${UNKNOWN_MINT}`,
      address: UNKNOWN_MINT,
      chainId: SolScope.Mainnet,
    });

    await expect(resolveSolanaPayTokenMeta(UNKNOWN_MINT)).resolves.toEqual({
      symbol: 'BONK',
      name: 'Bonk',
      decimals: 5,
      image: 'https://example.com/bonk.png',
    });
  });
});
