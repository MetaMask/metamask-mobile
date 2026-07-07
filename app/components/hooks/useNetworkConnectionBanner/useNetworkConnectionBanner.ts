import { useCallback, useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { hexToNumber } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import { selectNetworkConnectionBannerState } from '../../../selectors/networkConnectionBanner';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import { useAnalytics } from '../useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import type {
  NetworkConnectionBannerState,
  NetworkConnectionBannerStatus,
} from '../../UI/NetworkConnectionBanner/types';
import { isPublicEndpointUrl } from '../../../core/Engine/controllers/network-controller/utils';
import onlyKeepHost from '../../../util/onlyKeepHost';
import { INFURA_PROJECT_ID } from '../../../constants/network';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';

const infuraProjectId = INFURA_PROJECT_ID ?? '';

function sanitizeRpcUrl(rpcUrl: string) {
  return isPublicEndpointUrl(rpcUrl, infuraProjectId)
    ? onlyKeepHost(rpcUrl)
    : 'custom';
}

const useNetworkConnectionBanner = (): {
  networkConnectionBannerState: NetworkConnectionBannerState;
  updateRpc: (
    rpcUrl: string,
    status: NetworkConnectionBannerStatus,
    chainId: string,
  ) => void;
  /**
   * Switch the default RPC endpoint to Infura for the current unavailable network.
   * Only available when the network has an Infura endpoint to switch to.
   * Returns a promise that resolves when the switch is complete (or rejects on error).
   */
  switchToInfura: () => Promise<void>;
} => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { toastRef } = useContext(ToastContext);
  const networkConnectionBannerState = useSelector(
    selectNetworkConnectionBannerState,
  );

  // Fire analytics whenever the banner is visible. The banner's show/hide
  // and 5s/30s escalation are driven by NetworkConnectionBannerController.
  useEffect(() => {
    if (networkConnectionBannerState.visible) {
      const sanitizedUrl = sanitizeRpcUrl(networkConnectionBannerState.rpcUrl);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN)
          .addProperties({
            banner_type: networkConnectionBannerState.status,
            chain_id_caip: `eip155:${hexToNumber(
              networkConnectionBannerState.chainId,
            )}`,
            rpc_endpoint_url: sanitizedUrl,
            rpc_domain: sanitizedUrl,
          })
          .build(),
      );
    }
  }, [networkConnectionBannerState, trackEvent, createEventBuilder]);

  const updateRpc = useCallback(
    (
      rpcUrl: string,
      status: NetworkConnectionBannerStatus,
      chainId: string,
    ) => {
      navigation.navigate(Routes.EDIT_NETWORK, {
        network: rpcUrl,
        shouldNetworkSwitchPopToWallet: false,
        shouldShowPopularNetworks: false,
        trackRpcUpdateFromBanner: true,
      });

      const sanitizedUrl = sanitizeRpcUrl(rpcUrl);
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.NETWORK_CONNECTION_BANNER_UPDATE_RPC_CLICKED,
        )
          .addProperties({
            banner_type: status,
            chain_id_caip: `eip155:${hexToNumber(chainId)}`,
            // @deprecated: will be removed in a future release
            rpc_endpoint_url: sanitizedUrl,
            rpc_domain: sanitizedUrl,
          })
          .build(),
      );
    },
    [navigation, trackEvent, createEventBuilder],
  );

  const switchToInfura = useCallback(async () => {
    if (!networkConnectionBannerState.visible) {
      return;
    }

    const { chainId, status, canSwitchToInfura } =
      networkConnectionBannerState;
    if (!canSwitchToInfura) {
      return;
    }

    const sanitizedUrl = sanitizeRpcUrl(networkConnectionBannerState.rpcUrl);
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SWITCH_TO_METAMASK_DEFAULT_RPC_CLICKED,
      )
        .addProperties({
          banner_type: status,
          chain_id_caip: `eip155:${hexToNumber(chainId)}`,
          rpc_endpoint_url: sanitizedUrl,
          rpc_domain: sanitizedUrl,
        })
        .build(),
    );

    try {
      await Engine.context.NetworkConnectionBannerController.switchToDefaultInfuraRpcEndpoint(
        chainId,
      );

      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings(
              'network_connection_banner.updated_to_metamask_default',
            ),
          },
        ],
        iconName: IconName.Confirmation,
        hasNoTimeout: false,
      });
    } catch (error) {
      // Do not show the success toast on failure
      console.error(
        'Failed to switch to the default Infura RPC endpoint:',
        error,
      );
    }
  }, [networkConnectionBannerState, trackEvent, createEventBuilder, toastRef]);

  return {
    networkConnectionBannerState,
    updateRpc,
    switchToInfura,
  };
};

export default useNetworkConnectionBanner;
