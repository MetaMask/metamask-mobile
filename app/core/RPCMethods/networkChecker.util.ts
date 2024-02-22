import axios from 'axios';
import { BannerAlertSeverity } from '../../component-library/components/Banners/Banner';
import { strings } from '../../../locales/i18n';

const checkSafeNetwork = async (
  chainIdDecimal: string,
  rpcUrl: string,
  nickname: string,
  ticker: string,
) => {
  const alerts = [];
  const EVM_NATIVE_TOKEN_DECIMALS = 18;

  const response = await axios.get('https://chainid.network/chains.json');
  const safeChainsList = response.data;

  const matchedChain = safeChainsList.find(
    (chain: { chainId: number }) => chain.chainId.toString() === chainIdDecimal,
  );

  if (matchedChain) {
    const { origin } = new URL(rpcUrl);
    if (
      !matchedChain.rpc
        ?.map((rpc: string) => new URL(rpc).origin)
        .includes(origin)
    ) {
      alerts.push({
        alertError: strings('add_custom_network.invalid_rpc_url'),
        alertSeverity: BannerAlertSeverity.Error,
        alertOrigin: 'rpc_url',
      });
    }
    if (matchedChain.nativeCurrency?.decimals !== EVM_NATIVE_TOKEN_DECIMALS) {
      alerts.push({
        alertError: strings('add_custom_network.invalid_chain_token_decimals'),
        alertSeverity: BannerAlertSeverity.Warning,
        alertOrigin: 'decimals',
      });
    }
    if (matchedChain.name?.toLowerCase() !== nickname?.toLowerCase()) {
      alerts.push({
        alertError: strings('add_custom_network.unrecognized_chain_name'),
        alertSeverity: BannerAlertSeverity.Warning,
        alertOrigin: 'chain_name',
      });
    }
    if (matchedChain.nativeCurrency?.symbol !== ticker) {
      alerts.push({
        alertError: strings('add_custom_network.unrecognized_chain_ticker'),
        alertSeverity: BannerAlertSeverity.Warning,
        alertOrigin: 'chain_ticker',
      });
    }
  }

  if (!matchedChain) {
    alerts.push({
      alertError: strings('add_custom_network.unrecognized_chain_id'),
      alertSeverity: BannerAlertSeverity.Error,
      alertOrigin: 'unknown_chain',
    });
  }

  return alerts;
};

export default checkSafeNetwork;
