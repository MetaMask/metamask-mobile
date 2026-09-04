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
import { fetchAssetMetadata } from '../../../components/UI/Bridge/hooks/useAssetMetadata/utils';
import {
  hasExcessiveSolanaPayDecimals,
  parseSolanaPayUrl,
  type SolanaPayParseResult,
} from '../utils/parseSolanaPayUrl';

const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOLANA_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

/** Offline fallback for common Solana Pay mints when the token API is unreachable. */
const WELL_KNOWN_SPL_TOKENS: Record<
  string,
  { symbol: string; name: string; decimals: number }
> = {
  [SOLANA_USDC_MINT]: { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  [SOLANA_USDT_MINT]: { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
};

interface SolanaPayTokenMeta {
  symbol: string;
  name: string;
  decimals: number;
  image?: string;
}

const buildNativeSolAsset = (): AssetType => {
  const chainId = SolScope.Mainnet;
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
};

const buildSplAsset = (mint: string, meta: SolanaPayTokenMeta): AssetType => {
  const chainId = SolScope.Mainnet;
  const address = `${chainId}/token:${mint}`;
  return {
    address,
    assetId: address,
    chainId,
    symbol: meta.symbol,
    ticker: meta.symbol,
    name: meta.name,
    decimals: meta.decimals,
    isNative: false,
    isETH: false,
    image: meta.image ?? '',
    logo: meta.image,
    balance: '0',
  } as AssetType;
};

/**
 * Resolves SPL mint metadata via the token API. Falls back to a small
 * well-known map for offline USDC/USDT; returns null for unknown mints so we
 * never invent decimals/symbol (which would corrupt the on-chain amount).
 */
export const resolveSolanaPayTokenMeta = async (
  mint: string,
): Promise<SolanaPayTokenMeta | null> => {
  const metadata = await fetchAssetMetadata(mint, SolScope.Mainnet);
  if (metadata?.symbol && typeof metadata.decimals === 'number') {
    return {
      symbol: metadata.symbol,
      name: metadata.name || metadata.symbol,
      decimals: metadata.decimals,
      image: metadata.image,
    };
  }

  const known = WELL_KNOWN_SPL_TOKENS[mint];
  return known ?? null;
};

export const buildSolanaPayAsset = (
  splToken: string | undefined,
  meta?: SolanaPayTokenMeta,
): AssetType => {
  if (!splToken) {
    return buildNativeSolAsset();
  }

  if (!meta) {
    throw new Error(
      'SPL token metadata is required to build a Solana Pay asset',
    );
  }

  return buildSplAsset(splToken, meta);
};

const navigateToSolanaPaySend = (
  parsed: Extract<SolanaPayParseResult, { type: 'transfer' }>,
  asset: AssetType,
) => {
  handleSendPageNavigation(NavigationService.navigation.navigate, {
    location: InitSendLocation.QRScanner,
    predefinedRecipient: {
      address: parsed.recipient,
      chainType: ChainType.SOLANA,
    },
    asset,
    predefinedAmount: parsed.amount,
  });
};

async function handleSolanaUrl({ url }: { url: string }) {
  const parsed = parseSolanaPayUrl(url);

  if (!parsed) {
    Alert.alert(strings('deeplink.invalid'));
    return;
  }

  switch (parsed.type) {
    case 'transfer': {
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

      let asset: AssetType;
      if (parsed.splToken) {
        const meta = await resolveSolanaPayTokenMeta(parsed.splToken);
        if (!meta) {
          Alert.alert(
            strings('deeplink.invalid'),
            strings('deeplink.solana_pay_token_not_supported'),
          );
          return;
        }
        asset = buildSolanaPayAsset(parsed.splToken, meta);
      } else {
        asset = buildSolanaPayAsset();
      }

      if (
        parsed.amount &&
        hasExcessiveSolanaPayDecimals(parsed.amount, asset.decimals)
      ) {
        Alert.alert(strings('deeplink.invalid'));
        return;
      }

      navigateToSolanaPaySend(parsed, asset);
      return;
    }
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
