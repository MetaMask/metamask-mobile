import { Alert } from 'react-native';
import { SolScope } from '@metamask/keyring-api';
import { strings } from '../../../../locales/i18n';
import NavigationService from '../../NavigationService';
import {
  ChainType,
  handleSendPageNavigation,
} from '../../../components/Views/confirmations/utils/send';
import { InitSendLocation } from '../../../components/Views/confirmations/constants/send';
import { AssetType } from '../../../components/Views/confirmations/types/token';
import {
  parseSolanaPayUrl,
  type SolanaPayParseResult,
} from '../utils/parseSolanaPayUrl';

const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOLANA_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

const WELL_KNOWN_SPL_TOKENS: Record<
  string,
  { symbol: string; name: string; decimals: number }
> = {
  [SOLANA_USDC_MINT]: { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  [SOLANA_USDT_MINT]: { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
};

export const buildSolanaPayAsset = (splToken?: string): AssetType => {
  const chainId = SolScope.Mainnet;

  if (!splToken) {
    const address = `${chainId}/slip44:501`;
    return {
      address,
      assetId: address,
      chainId,
      symbol: 'SOL',
      ticker: 'SOL',
      name: 'Solana',
      decimals: 9,
      isNative: true,
      isETH: false,
      image: '',
      logo: undefined,
      balance: '0',
    } as AssetType;
  }

  const known = WELL_KNOWN_SPL_TOKENS[splToken];
  const address = `${chainId}/token:${splToken}`;
  const symbol = known?.symbol ?? 'SPL';

  return {
    address,
    assetId: address,
    chainId,
    symbol,
    ticker: symbol,
    name: known?.name ?? 'Solana token',
    decimals: known?.decimals ?? 6,
    isNative: false,
    isETH: false,
    image: '',
    logo: undefined,
    balance: '0',
  } as AssetType;
};

const navigateToSolanaPaySend = (
  parsed: Extract<SolanaPayParseResult, { type: 'transfer' }>,
) => {
  handleSendPageNavigation(NavigationService.navigation.navigate, {
    location: InitSendLocation.QRScanner,
    predefinedRecipient: {
      address: parsed.recipient,
      chainType: ChainType.SOLANA,
    },
    asset: buildSolanaPayAsset(parsed.splToken),
    predefinedAmount: parsed.amount,
  });
};

function handleSolanaUrl({ url }: { url: string; origin: string }) {
  const parsed = parseSolanaPayUrl(url);

  if (!parsed) {
    Alert.alert(strings('deeplink.invalid'));
    return;
  }

  switch (parsed.type) {
    case 'transfer':
      // Solana Pay `reference` accounts must appear on-chain for merchant
      // settlement. Snap confirmSend cannot attach them, so reject rather
      // than send an unassociable payment.
      if (parsed.reference) {
        Alert.alert(
          strings('deeplink.not_supported'),
          strings('deeplink.solana_pay_reference_not_supported'),
        );
        return;
      }
      navigateToSolanaPaySend(parsed);
      return;
    case 'transaction-request':
      Alert.alert(
        strings('deeplink.not_supported'),
        strings('deeplink.solana_pay_transaction_request_not_supported'),
      );
      return;
    default: {
      const exhaustiveCheck: never = parsed;
      return exhaustiveCheck;
    }
  }
}

export default handleSolanaUrl;
