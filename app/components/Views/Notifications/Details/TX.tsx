/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { strings } from '../../../../../locales/i18n';

import {
  getRowDetails,
  HalRawNotification,
  Notification,
  TRIGGER_TYPES,
} from '../../../../util/notifications';

import { BottomSheetRef } from '../../../../component-library/components/BottomSheets/BottomSheet';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../component-library/components/Icons/Icon';

import { Theme } from '../../../../util/theme/models';
import useDetails from './useDetails';
import NetworkFee from './NetworkFee';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
import { View } from 'react-native';

interface TXDetailsProps {
  notification: HalRawNotification;
  styles: any;
  theme: Theme;
  accountAvatarType?: AvatarAccountType;
  navigation: any;
  copyToClipboard: (type: string, selectedString?: string) => Promise<void>;
}

const TXDetails = ({
  notification,
  styles,
  theme,
  accountAvatarType,
  navigation,
  copyToClipboard,
}: TXDetailsProps) => {
  const [notificationDetails, setNotificationDetails] =
    useState<Record<string, any>>();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const sheetRef = useRef<BottomSheetRef>(null);

  const {
    renderNFT,
    renderTransfer,
    renderStake,
    renderStakeReadyToBeWithdrawn,
    renderSwap,
  } = useDetails({
    notification,
    theme,
    accountAvatarType,
    navigation,
    copyToClipboard,
  });

  useEffect(() => {
    setNotificationDetails(
      getRowDetails(notification as Notification)?.details || {},
    );
  }, [notification]);

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
        return renderTransfer(notificationDetails);
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
          transaction={notification}
          styles={styles}
          onClosed={() => setIsCollapsed(true)}
        />
      )}
      <Button
        variant={ButtonVariants.Secondary}
        label={strings('transactions.view_on_etherscan')}
        style={styles.ctaBtn}
        // eslint-disable-next-line no-console
        onPress={() => console.log('View on etherscan')}
        endIconName={IconName.Arrow2Upright}
      />
    </View>
  );
};

export default TXDetails;
