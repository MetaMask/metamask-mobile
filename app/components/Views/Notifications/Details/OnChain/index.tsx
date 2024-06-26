/* eslint-disable react/prop-types */
import React, { useCallback, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { useSelector } from 'react-redux';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';

import {
  getRowDetails,
  HalRawNotificationsWithNetworkFields,
  Notification,
  TRIGGER_TYPES,
} from '../../../../../util/notifications';

import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

import { Theme } from '../../../../../util/theme/models';
import useDetails from '../hooks/useDetails';
import NetworkFee from '../NetworkFee';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../../../../selectors/networkController';

import useBlockExplorer from '../../../../../components/UI/Swaps/utils/useBlockExplorer.js';

interface OnChainDetailsProps {
  notification: Notification;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
  theme: Theme;
  accountAvatarType?: AvatarAccountType;
  navigation: NavigationProp<ParamListBase>;
  copyToClipboard: (type: string, selectedString?: string) => Promise<void>;
}

const OnChainDetails = ({
  notification,
  styles,
  theme,
  accountAvatarType,
  navigation,
  copyToClipboard,
}: OnChainDetailsProps) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const providerConfig = useSelector(selectProviderConfig);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const explorer = useBlockExplorer(providerConfig, networkConfigurations);

  const handleExplorerLinkPress = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  const sheetRef = useRef<BottomSheetRef>(null);

  const notificationDetails = getRowDetails(
    notification as Notification,
  )?.details;

  const {
    renderNFT,
    renderTransfer,
    renderStake,
    renderStakeReadyToBeWithdrawn,
    renderSwap,
  } = useDetails({
    theme,
    accountAvatarType,
    navigation,
    copyToClipboard,
  });

  const renderNotificationDetails = useCallback(() => {
    switch (notification.type) {
      case TRIGGER_TYPES.ERC721_SENT:
      case TRIGGER_TYPES.ERC721_RECEIVED:
      case TRIGGER_TYPES.ERC1155_SENT:
      case TRIGGER_TYPES.ERC1155_RECEIVED:
        return renderNFT(notificationDetails);
      case TRIGGER_TYPES.LIDO_STAKE_COMPLETED:
      case TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED:
      case TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED:
      case TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED:
      case TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED:
        return renderStake(notificationDetails);
      case TRIGGER_TYPES.ERC20_RECEIVED:
        return renderTransfer(notificationDetails);
      case TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN:
        return renderStakeReadyToBeWithdrawn(notificationDetails);
      case TRIGGER_TYPES.METAMASK_SWAP_COMPLETED:
        return renderSwap(notificationDetails);
      case TRIGGER_TYPES.ERC20_SENT:
      default:
        return null; // We do not want to render components that do not match
    }
  }, [
    notification.type,
    notificationDetails,
    renderNFT,
    renderStake,
    renderStakeReadyToBeWithdrawn,
    renderSwap,
    renderTransfer,
  ]);

  return (
    <View style={styles.renderContainer}>
      {renderNotificationDetails()}
      {!isCollapsed && (
        <NetworkFee
          sheetRef={sheetRef}
          notification={notification as HalRawNotificationsWithNetworkFields}
          styles={styles}
          onClosed={() => setIsCollapsed(true)}
        />
      )}
      {'tx_hash' in notification && (
        <Button
          variant={ButtonVariants.Secondary}
          label={strings('transactions.view_on_etherscan')}
          style={styles.ctaBtn}
          onPress={() =>
            handleExplorerLinkPress(explorer.tx(notification.tx_hash))
          }
          endIconName={IconName.Arrow2Upright}
        />
      )}
    </View>
  );
};

export default OnChainDetails;
