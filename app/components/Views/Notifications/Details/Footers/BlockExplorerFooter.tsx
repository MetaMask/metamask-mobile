import { toHex } from '@metamask/controller-utils';
import React, { useMemo } from 'react';
import { Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import {
  Button,
  ButtonVariant,
  IconName as DesignSystemIconName,
} from '@metamask/design-system-react-native';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { getNetworkDetailsFromNotifPayload } from '../../../../../util/notifications';
import { ModalFooterBlockExplorer } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import onChainAnalyticProperties from '../../../../../util/notifications/methods/notification-analytics';
import {
  INotification,
  isOnChainRawNotification,
} from '@metamask/notification-services-controller/notification-services';

type BlockExplorerFooterProps = ModalFooterBlockExplorer & {
  notification: INotification;
};

export default function BlockExplorerFooter(props: BlockExplorerFooterProps) {
  const { styles } = useStyles();
  const { notification } = props;
  const { trackEvent, createEventBuilder } = useAnalytics();

  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const networkBlockExplorer = useMemo(() => {
    const hexChainId = toHex(props.chainId);
    return Object.values(networkConfigurations).find(
      (networkConfig) => networkConfig.chainId === hexChainId,
    )?.blockExplorerUrls?.[0];
  }, [networkConfigurations, props.chainId]);

  const isOnChainNotification = isOnChainRawNotification(notification);
  if (!isOnChainNotification) {
    return null;
  }

  const { blockExplorerUrl } = getNetworkDetailsFromNotifPayload(
    notification.payload.network,
  );
  const url = networkBlockExplorer ?? blockExplorerUrl;

  if (!url) {
    return null;
  }

  const txHashUrl = `${url}/tx/${props.txHash}`;

  const onPress = () => {
    Linking.openURL(txHashUrl);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATION_DETAIL_CLICKED)
        .addProperties({
          notification_id: notification.id,
          notification_type: notification.type,
          ...onChainAnalyticProperties(notification),
          clicked_item: 'block_explorer',
        })
        .build(),
    );
  };

  return (
    <Button
      variant={ButtonVariant.Primary}
      style={styles.ctaBtn}
      endIconName={DesignSystemIconName.Arrow2UpRight}
      onPress={onPress}
    >
      {strings('asset_details.options.view_on_block')}
    </Button>
  );
}
