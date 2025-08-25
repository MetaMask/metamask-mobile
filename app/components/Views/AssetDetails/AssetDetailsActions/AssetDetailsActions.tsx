import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import styleSheet from './AssetDetailsActions.styles';
import { useStyles } from '../../../../component-library/hooks';
import MainActionButton from '../../../../component-library/components-temp/MainActionButton';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { TokenOverviewSelectorsIDs } from '../../../../../e2e/selectors/wallet/TokenOverview.selectors';
import { useSelector } from 'react-redux';
import { selectCanSignTransactions } from '../../../../selectors/accountsController';
import Routes from '../../../../constants/navigation/Routes';
import useRampNetwork from '../../../UI/Ramp/Aggregator/hooks/useRampNetwork';
import useDepositEnabled from '../../../UI/Ramp/Deposit/hooks/useDepositEnabled';

export interface AssetDetailsActionsProps {
  displayFundButton: boolean | undefined;
  displaySwapsButton: boolean | undefined;
  displayBridgeButton: boolean | undefined;
  swapsIsLive: boolean | undefined;
  onBuy?: () => void;
  goToSwaps: () => void;
  goToBridge: () => void;
  onSend: () => void;
  onReceive: () => void;
  // Asset context for fund flow
  asset?: {
    address?: string;
    chainId?: string;
  };
  // Optional custom action IDs to avoid test ID conflicts
  fundButtonActionID?: string;
  swapButtonActionID?: string;
  bridgeButtonActionID?: string;
  sendButtonActionID?: string;
  receiveButtonActionID?: string;
}

export const AssetDetailsActions: React.FC<AssetDetailsActionsProps> = ({
  displayFundButton,
  displaySwapsButton,
  displayBridgeButton,
  swapsIsLive,
  onBuy,
  goToSwaps,
  goToBridge,
  onSend,
  onReceive,
  asset,
  fundButtonActionID = TokenOverviewSelectorsIDs.FUND_BUTTON,
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

  const handleFundPress = () => {
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
      {displayFundButton && (
        <View style={styles.buttonContainer}>
          <MainActionButton
            iconName={IconName.Money}
            label={strings('asset_overview.fund_button')}
            onPress={handleFundPress}
            isDisabled={!isFundingAvailable}
            testID={fundButtonActionID}
          />
        </View>
      )}
      {displaySwapsButton && (
        <View style={styles.buttonContainer}>
          <MainActionButton
            iconName={IconName.SwapVertical}
            label={strings('asset_overview.swap')}
            onPress={() => goToSwaps()}
            isDisabled={!canSignTransactions || !swapsIsLive}
            testID={swapButtonActionID}
          />
        </View>
      )}
      {displayBridgeButton ? (
        <View style={styles.buttonContainer}>
          <MainActionButton
            iconName={IconName.Bridge}
            label={strings('asset_overview.bridge')}
            onPress={goToBridge}
            isDisabled={!canSignTransactions}
            testID={bridgeButtonActionID}
          />
        </View>
      ) : null}
      <View style={styles.buttonContainer}>
        <MainActionButton
          iconName={IconName.Send}
          label={strings('asset_overview.send_button')}
          onPress={onSend}
          isDisabled={!canSignTransactions}
          testID={sendButtonActionID}
        />
      </View>
      <View style={styles.buttonContainer}>
        <MainActionButton
          iconName={IconName.Received}
          label={strings('asset_overview.receive_button')}
          onPress={onReceive}
          isDisabled={false}
          testID={receiveButtonActionID}
        />
      </View>
    </View>
  );
};

export default AssetDetailsActions;
