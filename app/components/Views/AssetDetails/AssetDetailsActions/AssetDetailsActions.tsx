import React from 'react';
import { View } from 'react-native';
import styleSheet from './AssetDetailsActions.styles';
import { useStyles } from '../../../../component-library/hooks';
import WalletAction from '../../../../components/UI/WalletAction';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { TokenOverviewSelectorsIDs } from '../../../../../e2e/selectors/wallet/TokenOverview.selectors';
import { useSelector } from 'react-redux';
import { selectCanSignTransactions } from '../../../../selectors/accountsController';

export interface AssetDetailsActionsProps {
  displayBuyButton: boolean | undefined;
  displaySwapsButton: boolean | undefined;
  displayBridgeButton: boolean | undefined;
  swapsIsLive: boolean | undefined;
  onBuy: () => void;
  goToSwaps: () => void;
  goToBridge: () => void;
  onSend: () => void;
  onReceive: () => void;
  // Optional custom action IDs to avoid test ID conflicts
  buyButtonActionID?: string;
  swapButtonActionID?: string;
  bridgeButtonActionID?: string;
  sendButtonActionID?: string;
  receiveButtonActionID?: string;
}

export const AssetDetailsActions: React.FC<AssetDetailsActionsProps> = ({
  displayBuyButton,
  displaySwapsButton,
  displayBridgeButton,
  swapsIsLive,
  onBuy,
  goToSwaps,
  goToBridge,
  onSend,
  onReceive,
  buyButtonActionID = TokenOverviewSelectorsIDs.BUY_BUTTON,
  swapButtonActionID = TokenOverviewSelectorsIDs.SWAP_BUTTON,
  bridgeButtonActionID = TokenOverviewSelectorsIDs.BRIDGE_BUTTON,
  sendButtonActionID = TokenOverviewSelectorsIDs.SEND_BUTTON,
  receiveButtonActionID = TokenOverviewSelectorsIDs.RECEIVE_BUTTON,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const canSignTransactions = useSelector(selectCanSignTransactions);

  return (
    <View style={styles.activitiesButton}>
      {displayBuyButton && (
        <View style={styles.buttonWrapper}>
          <WalletAction
            iconName={IconName.Add}
            onPress={onBuy}
            iconStyle={styles.icon}
            containerStyle={styles.containerStyle}
            iconSize={AvatarSize.Lg}
            disabled={!canSignTransactions}
            actionID={buyButtonActionID}
          />
          <Text variant={TextVariant.BodyMD}>
            {strings('asset_overview.buy_button')}
          </Text>
        </View>
      )}
      {displaySwapsButton && (
        <View style={styles.buttonWrapper}>
          <WalletAction
            iconName={IconName.SwapHorizontal}
            onPress={() => goToSwaps()}
            iconStyle={styles.icon}
            containerStyle={styles.containerStyle}
            iconSize={AvatarSize.Lg}
            disabled={!canSignTransactions || !swapsIsLive}
            actionID={swapButtonActionID}
          />
          <Text variant={TextVariant.BodyMD}>
            {strings('asset_overview.swap')}
          </Text>
        </View>
      )}
      {displayBridgeButton ? (
        <View style={styles.buttonWrapper}>
          <WalletAction
            iconName={IconName.Bridge}
            onPress={goToBridge}
            iconStyle={styles.icon}
            containerStyle={styles.containerStyle}
            iconSize={AvatarSize.Lg}
            disabled={!canSignTransactions}
            actionID={bridgeButtonActionID}
          />
          <Text variant={TextVariant.BodyMD}>
            {strings('asset_overview.bridge')}
          </Text>
        </View>
      ) : null}
      <View style={styles.buttonWrapper}>
        <WalletAction
          iconName={IconName.Arrow2UpRight}
          onPress={onSend}
          iconStyle={styles.icon}
          containerStyle={styles.containerStyle}
          iconSize={AvatarSize.Lg}
          disabled={!canSignTransactions}
          actionID={sendButtonActionID}
        />
        <Text variant={TextVariant.BodyMD}>
          {strings('asset_overview.send_button')}
        </Text>
      </View>
      <View style={styles.buttonWrapper}>
        <WalletAction
          iconName={IconName.QrCode}
          onPress={onReceive}
          iconStyle={styles.icon}
          containerStyle={styles.containerStyle}
          iconSize={AvatarSize.Lg}
          disabled={false}
          actionID={receiveButtonActionID}
        />
        <Text variant={TextVariant.BodyMD}>
          {strings('asset_overview.receive_button')}
        </Text>
      </View>
    </View>
  );
};

export default AssetDetailsActions;
