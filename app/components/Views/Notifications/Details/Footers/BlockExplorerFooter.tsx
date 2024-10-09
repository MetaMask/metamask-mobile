import { toHex } from '@metamask/controller-utils';
import React, { useMemo } from 'react';
import { Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import {
  getBlockExplorerByChainId,
  TRIGGER_TYPES,
} from '../../../../../util/notifications';
import { ModalFooterBlockExplorer } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { type Notification } from '../../../../../util/notifications/types';
import { useMetrics } from '../../../../../components/hooks/useMetrics';

type BlockExplorerFooterProps = ModalFooterBlockExplorer & {
  notification: Notification;
};

export default function BlockExplorerFooter(props: BlockExplorerFooterProps) {
  const { styles } = useStyles();
  const { notification } = props;
  const { trackEvent } = useMetrics();
  const defaultBlockExplorer = getBlockExplorerByChainId(props.chainId);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const networkBlockExplorer = useMemo(() => {
    const hexChainId = toHex(props.chainId);
    return Object.values(networkConfigurations).find(
      (networkConfig) => networkConfig.chainId === hexChainId,
    )?.rpcPrefs?.blockExplorerUrl;
  }, [networkConfigurations, props.chainId]);

  const url = networkBlockExplorer ?? defaultBlockExplorer;

  if (!url) {
    return null;
  }

  const txHashUrl = `${url}/tx/${props.txHash}`;

  const onPress = () => {
    Linking.openURL(txHashUrl);
    trackEvent(MetaMetricsEvents.NOTIFICATION_DETAIL_CLICKED, {
      notification_id: notification.id,
      notification_type: notification.type,
      ...(notification.type !== TRIGGER_TYPES.FEATURES_ANNOUNCEMENT
        ? { chain_id: notification?.chain_id }
        : {}),
      clicked_item: 'block_explorer',
    });
  };

  return (
    <Button
      variant={ButtonVariants.Secondary}
      label={strings('asset_details.options.view_on_block')}
      style={styles.ctaBtn}
      endIconName={IconName.Arrow2Upright}
      onPress={onPress}
    />
  );
}
