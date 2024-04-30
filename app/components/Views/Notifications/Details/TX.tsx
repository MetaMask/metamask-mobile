/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../locales/i18n';

import {
  getRowDetails,
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
import GasDetails from './Gas';
import { createStyles } from './styles';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';

interface TXDetailsProps {
  notification: Notification;
  styles: any;
  theme: Theme;
  accountAvatarType?: AvatarAccountType;
  navigation: any;
  copyToClipboard: (type: string, selectedString?: string) => Promise<void>;
}

const TXDetails = ({
  notification,
  theme,
  accountAvatarType,
  navigation,
  copyToClipboard,
}: TXDetailsProps) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [notificationDetails, setNotificationDetails] =
    useState<Record<string, any>>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const styles = createStyles(theme);

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
    setNotificationDetails(getRowDetails(notification)?.details || {});
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

  // const fetchNetworkFees = useCallback(async () => {
  //   try {
  //     const networkFees = await getNetworkFees(notification)
  //     if (networkFees) {
  //       setNetworkFees({
  //         transactionFee: {
  //           transactionFeeInEther: networkFees.transactionFeeInEth,
  //           transactionFeeInUsd: networkFees.transactionFeeInUsd,
  //         },
  //         gasLimitUnits: networkFees.gasLimit,
  //         gasUsedUnits: networkFees.gasUsed,
  //         baseFee: networkFees.baseFee,
  //         priorityFee: networkFees.priorityFee,
  //         maxFeePerGas: networkFees.maxFeePerGas,
  //       })
  //     }
  //   } catch (err) {
  //     setNetworkFeesError(true)
  //   }
  // }, [notification])

  // const renderNetworkFee = useCallback(
  //   () => (
  //     <View style={styles.row}>
  //       <AvatarIcon
  //         size={AvatarSize.Md}
  //         name={IconName.Gas}
  //         iconColor={IconColor.Info}
  //         style={styles.badgeWrapper}
  //       />
  //       <View style={styles.boxLeft}>
  //         <Text variant={TextVariant.BodyLGMedium}>
  //           {strings('transactions.network_fee')}
  //         </Text>

  //         <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
  //           {notification.data?.network_fee.gas_price}
  //         </Text>
  //       </View>
  //       <Pressable
  //         style={styles.rightSection}
  //         hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
  //         onPress={() => {
  //           setIsCollapsed(!isCollapsed);
  //           sheetRef.current?.onOpenBottomSheet();
  //         }}
  //       >
  //         <Text variant={TextVariant.BodyMD} style={styles.copyTextBtn}>
  //           {strings('transactions.details')}
  //         </Text>
  //         <Icon
  //           color={IconColor.Primary}
  //           style={styles.copyIconRight}
  //           name={IconName.ArrowDown}
  //           size={IconSize.Md}
  //         />
  //       </Pressable>
  //     </View>
  //   ),
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   [notification],
  // );

  return (
    <View style={styles.renderContainer}>
      {renderNotificationDetails()}
      {!isCollapsed && (
        <GasDetails
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
