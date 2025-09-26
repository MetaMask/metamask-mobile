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
import { selectIsSwapsEnabled } from '../../../../core/redux/slices/bridge';
import Routes from '../../../../constants/navigation/Routes';
import useDepositEnabled from '../../../UI/Ramp/Deposit/hooks/useDepositEnabled';
import { CaipChainId, Hex } from '@metamask/utils';
import { RootState } from '../../../../reducers';

export interface AssetDetailsActionsProps {
  displayBuyButton: boolean | undefined;
  displaySwapsButton: boolean | undefined;
  displayBridgeButton: boolean | undefined;
  chainId: Hex | CaipChainId;
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
  chainId,
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
  const isSwapsEnabled = useSelector((state: RootState) =>
    selectIsSwapsEnabled(state, chainId),
  );
  const { navigate } = useNavigation();

  // Check if FundActionMenu would be empty
  const { isDepositEnabled } = useDepositEnabled();
  const isBuyMenuAvailable = isDepositEnabled || true;

  // Button should be enabled if we have standard funding options OR a custom onBuy function
  const isBuyingAvailable = isBuyMenuAvailable || !!onBuy;

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
        <View style={styles.buttonContainer}>
          <MainActionButton
            iconName={IconName.AttachMoney}
            label={strings('asset_overview.buy_button')}
            onPress={handleBuyPress}
            isDisabled={!isBuyingAvailable}
            testID={buyButtonActionID}
          />
        </View>
      )}
      {displaySwapsButton && (
        <View style={styles.buttonContainer}>
          <MainActionButton
            iconName={IconName.SwapVertical}
            label={strings('asset_overview.swap')}
            onPress={() => goToSwaps()}
            isDisabled={!isSwapsEnabled}
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
