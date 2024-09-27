import React, { useMemo } from 'react';
import { Platform, View } from 'react-native';
import styleSheet from './AssetDetailsActions.styles';
import { useStyles } from '../../../../component-library/hooks';
import WalletAction from '../../../../components/UI/WalletAction';
import { strings } from '../../../../../locales/i18n';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import {
  TOKEN_OVERVIEW_BRIDGE_BUTTON,
  TOKEN_OVERVIEW_BUY_BUTTON,
  TOKEN_OVERVIEW_RECEIVE_BUTTON,
  TOKEN_OVERVIEW_SEND_BUTTON,
  TOKEN_OVERVIEW_SWAP_BUTTON,
} from '../../../../../wdio/screen-objects/testIDs/Screens/TokenOverviewScreen.testIds';
import { WalletActionType } from '../../../UI/WalletAction/WalletAction.types';

export interface AssetDetailsActionsProps {
  displayBuyButton: boolean | undefined;
  displaySwapsButton: boolean | undefined;
  onBuy: () => void;
  goToSwaps: () => void;
  goToBridge: () => void;
  onSend: () => void;
  onReceive: () => void;
}

export const AssetDetailsActions: React.FC<AssetDetailsActionsProps> = ({
  displayBuyButton,
  displaySwapsButton,
  onBuy,
  goToSwaps,
  goToBridge,
  onSend,
  onReceive,
}) => {
  const { styles } = useStyles(styleSheet, {});

  const walletActionProps = useMemo(
    () => ({
      iconStyle: styles.icon,
      containerStyle: styles.containerStyle,
      iconSize: AvatarSize.Lg,
    }),
    [styles],
  );

  const renderWalletAction = useMemo(
    () =>
      (
        actionType: WalletActionType,
        iconName: IconName,
        onPress: () => void,
        testID: string,
        labelKey: string,
      ) =>
        (
          <View style={styles.buttonWrapper}>
            <WalletAction
              actionType={actionType}
              iconName={iconName}
              onPress={onPress}
              {...walletActionProps}
              {...generateTestId(Platform, testID)}
            />
            <Text variant={TextVariant.BodyMD}>{strings(labelKey)}</Text>
          </View>
        ),
    [walletActionProps, styles.buttonWrapper],
  );

  return (
    <View style={styles.activitiesButton}>
      {displayBuyButton &&
        renderWalletAction(
          WalletActionType.Buy,
          IconName.Add,
          onBuy,
          TOKEN_OVERVIEW_BUY_BUTTON,
          'asset_overview.buy_button',
        )}
      {displaySwapsButton &&
        renderWalletAction(
          WalletActionType.Swap,
          IconName.SwapHorizontal,
          goToSwaps,
          TOKEN_OVERVIEW_SWAP_BUTTON,
          'asset_overview.swap',
        )}
      {renderWalletAction(
        WalletActionType.Bridge,
        IconName.Bridge,
        goToBridge,
        TOKEN_OVERVIEW_BRIDGE_BUTTON,
        'asset_overview.bridge',
      )}
      {renderWalletAction(
        WalletActionType.Send,
        IconName.Arrow2Upright,
        onSend,
        TOKEN_OVERVIEW_SEND_BUTTON,
        'asset_overview.send_button',
      )}
      {renderWalletAction(
        WalletActionType.Receive,
        IconName.QrCode,
        onReceive,
        TOKEN_OVERVIEW_RECEIVE_BUTTON,
        'asset_overview.receive_button',
      )}
    </View>
  );
};

export default AssetDetailsActions;
