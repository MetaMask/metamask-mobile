import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Hex, isHexString } from '@metamask/utils';
import { NetworkStatus } from '@metamask/network-controller';

import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectNetworkControllerState } from '../../../../../../selectors/networkController';
import { useSendContext } from '../../../context/send-context';
import type { SendAlert } from './types';

const UNRELIABLE_NETWORK_ALERT_KEY = 'unreliableNetwork';

export function useUnreliableNetworkAlert(): {
  alert: SendAlert | null;
  navigateToEditNetwork: () => void;
} {
  const { chainId } = useSendContext();
  const navigation = useNavigation();
  const networkControllerState = useSelector(selectNetworkControllerState);

  const { alert, rpcUrl } = useMemo(() => {
    if (!chainId || !isHexString(chainId)) {
      return { alert: null, rpcUrl: undefined };
    }
    const networkConfiguration =
      networkControllerState?.networkConfigurationsByChainId?.[chainId as Hex];
    if (!networkConfiguration) {
      return { alert: null, rpcUrl: undefined };
    }
    const { rpcEndpoints, defaultRpcEndpointIndex, name } =
      networkConfiguration;
    const rpcEndpoint =
      rpcEndpoints[defaultRpcEndpointIndex] ?? rpcEndpoints[0];
    if (!rpcEndpoint) {
      return { alert: null, rpcUrl: undefined };
    }
    const status =
      networkControllerState?.networksMetadata?.[rpcEndpoint.networkClientId]
        ?.status;
    if (status === undefined || status === NetworkStatus.Available) {
      return { alert: null, rpcUrl: rpcEndpoint.url };
    }
    return {
      alert: {
        key: UNRELIABLE_NETWORK_ALERT_KEY,
        title: strings('send.unavailable_network_connection'),
        message: strings('send.unavailable_network_connection_description', {
          network: name,
        }),
        acknowledgeButtonLabel: strings('send.update'),
      },
      rpcUrl: rpcEndpoint.url,
    };
  }, [chainId, networkControllerState]);

  const navigateToEditNetwork = useCallback(() => {
    if (!rpcUrl) {
      return;
    }
    navigation.navigate(Routes.EDIT_NETWORK, {
      network: rpcUrl,
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });
  }, [navigation, rpcUrl]);

  return { alert, navigateToEditNetwork };
}

export { UNRELIABLE_NETWORK_ALERT_KEY };
