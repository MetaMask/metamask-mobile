import { toHex } from '@metamask/controller-utils';
import React, { useMemo } from 'react';
import { Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { getBlockExplorerByChainId } from '../../../../../util/notifications';
import { ModalFooterBlockExplorer } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';

type BlockExplorerFooterProps = ModalFooterBlockExplorer;

export default function BlockExplorerFooter(props: BlockExplorerFooterProps) {
  const { styles } = useStyles();
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

  return (
    <Button
      variant={ButtonVariants.Secondary}
      label={strings('asset_details.options.view_on_block')}
      style={styles.ctaBtn}
      onPress={() => Linking.openURL(txHashUrl)}
    />
  );
}
