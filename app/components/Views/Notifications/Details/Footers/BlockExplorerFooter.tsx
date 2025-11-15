import { toHex } from '@metamask/controller-utils';
import React, { useMemo } from 'react';
import { Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { getBlockExplorerByChainId } from '../../../../../util/notifications';
import { ModalFooterBlockExplorer } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { type INotification } from '../../../../../util/notifications/types';
import { useMetrics } from '../../../../../components/hooks/useMetrics';

type BlockExplorerFooterProps = ModalFooterBlockExplorer & {
  notification: INotification;
};

export default function BlockExplorerFooter(props: BlockExplorerFooterProps) {
  const { styles } = useStyles();
  const { notification } = props;
  const { trackEvent, createEventBuilder } = useMetrics();

  const defaultBlockExplorer = getBlockExplorerByChainId(props.chainId);
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const networkBlockExplorer = useMemo(() => {
    const hexChainId = toHex(props.chainId);
    return Object.values(networkConfigurations).find(
      (networkConfig) => networkConfig.chainId === hexChainId,
    )?.blockExplorerUrls?.[0];
  }, [networkConfigurations, props.chainId]);

  const url = networkBlockExplorer ?? defaultBlockExplorer;

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
          ...('chain_id' in notification && {
            chain_id: notification.chain_id,
          }),
          clicked_item: 'block_explorer',
        })
        .build(),
    );
  };

  return (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('asset_details.options.view_on_block')}
      style={styles.ctaBtn}
      endIconName={IconName.Arrow2UpRight}
      onPress={onPress}
    />
  );
}
