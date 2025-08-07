import React from 'react';
import { View } from 'react-native';
import styleSheet from './AssetDetailsActions.styles';
import { useStyles } from '../../../../component-library/hooks';
import MainActionButton from '../../../../component-library/components-temp/MainActionButton';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
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
        <MainActionButton
          iconName={IconName.Add}
          label={strings('asset_overview.buy_button')}
          onPress={onBuy}
          isDisabled={!canSignTransactions}
          testID={buyButtonActionID}
          style={styles.buttonContainer}
        />
      )}
      {displaySwapsButton && (
        <MainActionButton
          iconName={IconName.SwapVertical}
          label={strings('asset_overview.swap')}
          onPress={() => goToSwaps()}
          isDisabled={!canSignTransactions || !swapsIsLive}
          testID={swapButtonActionID}
          style={styles.buttonContainer}
        />
      )}
      {displayBridgeButton ? (
        <MainActionButton
          iconName={IconName.Bridge}
          label={strings('asset_overview.bridge')}
          onPress={goToBridge}
          isDisabled={!canSignTransactions}
          testID={bridgeButtonActionID}
          style={styles.buttonContainer}
        />
      ) : null}
      <MainActionButton
        iconName={IconName.Send}
        label={strings('asset_overview.send_button')}
        onPress={onSend}
        isDisabled={!canSignTransactions}
        testID={sendButtonActionID}
        style={styles.buttonContainer}
      />
      <MainActionButton
        iconName={IconName.Receive}
        label={strings('asset_overview.receive_button')}
        onPress={onReceive}
        isDisabled={false}
        testID={receiveButtonActionID}
        style={styles.buttonContainer}
      />
    </View>
  );
};

export default AssetDetailsActions;
