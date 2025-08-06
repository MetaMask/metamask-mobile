import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import styleSheet from './AssetDetailsActions.styles';
import { useStyles } from '../../../../component-library/hooks';
import WalletAction from '../../../../components/UI/WalletAction';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import MMText, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { TokenOverviewSelectorsIDs } from '../../../../../e2e/selectors/wallet/TokenOverview.selectors';
import { useSelector } from 'react-redux';
import { selectCanSignTransactions } from '../../../../selectors/accountsController';
import Routes from '../../../../constants/navigation/Routes';
import useRampNetwork from '../../../UI/Ramp/Aggregator/hooks/useRampNetwork';
import useDepositEnabled from '../../../UI/Ramp/Deposit/hooks/useDepositEnabled';

export interface AssetDetailsActionsProps {
  displayBuyButton: boolean | undefined;
  displaySwapsButton: boolean | undefined;
  displayBridgeButton: boolean | undefined;
  swapsIsLive: boolean | undefined;
  onBuy?: () => void;
  goToSwaps: () => void;
  goToBridge: () => void;
  onSend: () => void;
  onReceive: () => void;
  // Asset context for buy flow
  asset?: {
    address?: string;
    chainId?: string;
  };
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
  asset,
  buyButtonActionID = TokenOverviewSelectorsIDs.BUY_BUTTON,
  swapButtonActionID = TokenOverviewSelectorsIDs.SWAP_BUTTON,
  bridgeButtonActionID = TokenOverviewSelectorsIDs.BRIDGE_BUTTON,
  sendButtonActionID = TokenOverviewSelectorsIDs.SEND_BUTTON,
  receiveButtonActionID = TokenOverviewSelectorsIDs.RECEIVE_BUTTON,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const canSignTransactions = useSelector(selectCanSignTransactions);
  const { navigate } = useNavigation();

  // Check if FundActionMenu would be empty
  const [isNetworkRampSupported] = useRampNetwork();
  const { isDepositEnabled } = useDepositEnabled();
  const isFundMenuAvailable = isDepositEnabled || isNetworkRampSupported;

  // Button should be enabled if we have standard funding options OR a custom onBuy function
  const isFundingAvailable = isFundMenuAvailable || !!onBuy;

  const handleBuyPress = () => {
    // Navigate to FundActionMenu with both custom onBuy and asset context
    // The menu will prioritize custom onBuy over standard funding options
    // This allows custom funding flows even when deposit/ramp are unavailable
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.FUND_ACTION_MENU,
      params: {
        onBuy, // Custom buy function (takes priority if provided)
        asset, // Asset context for standard funding flows
      },
    });
  };

  return (
    <View style={styles.activitiesButton}>
      {displayBuyButton && (
        <View style={styles.buttonWrapper}>
          <WalletAction
            iconName={IconName.Money}
            onPress={handleBuyPress}
            iconStyle={styles.icon}
            containerStyle={styles.containerStyle}
            iconSize={AvatarSize.Lg}
            disabled={!canSignTransactions || !isFundingAvailable}
            actionID={buyButtonActionID}
          />
          <MMText variant={TextVariant.BodyMD}>
            {strings('asset_overview.fund_button')}
          </MMText>
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
          <MMText variant={TextVariant.BodyMD}>
            {strings('asset_overview.swap')}
          </MMText>
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
          <MMText variant={TextVariant.BodyMD}>
            {strings('asset_overview.bridge')}
          </MMText>
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
        <MMText variant={TextVariant.BodyMD}>
          {strings('asset_overview.send_button')}
        </MMText>
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
        <MMText variant={TextVariant.BodyMD}>
          {strings('asset_overview.receive_button')}
        </MMText>
      </View>
    </View>
  );
};

export default AssetDetailsActions;
