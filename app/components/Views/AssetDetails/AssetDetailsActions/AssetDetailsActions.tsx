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
            actionID={TokenOverviewSelectorsIDs.BUY_BUTTON}
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
            actionID={TokenOverviewSelectorsIDs.SWAP_BUTTON}
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
            actionID={TokenOverviewSelectorsIDs.BRIDGE_BUTTON}
          />
          <Text variant={TextVariant.BodyMD}>
            {strings('asset_overview.bridge')}
          </Text>
        </View>
      ) : null}
      <View style={styles.buttonWrapper}>
        <WalletAction
          iconName={IconName.Arrow2Upright}
          onPress={onSend}
          iconStyle={styles.icon}
          containerStyle={styles.containerStyle}
          iconSize={AvatarSize.Lg}
          disabled={!canSignTransactions}
          actionID={TokenOverviewSelectorsIDs.SEND_BUTTON}
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
          actionID={TokenOverviewSelectorsIDs.RECEIVE_BUTTON}
        />
        <Text variant={TextVariant.BodyMD}>
          {strings('asset_overview.receive_button')}
        </Text>
      </View>
    </View>
  );
};

export default AssetDetailsActions;
