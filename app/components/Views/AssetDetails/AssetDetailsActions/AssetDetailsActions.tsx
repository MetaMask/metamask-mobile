import React from 'react';
import { View, Platform } from 'react-native';
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

  return (
    <View style={styles.activitiesButton}>
      {displayBuyButton && (
        <View style={styles.buttonWrapper}>
          <WalletAction
            iconName={IconName.Add}
            iconSize={AvatarSize.Lg}
            onPress={onBuy}
            iconStyle={styles.icon}
            containerStyle={styles.containerStyle}
            {...generateTestId(Platform, TOKEN_OVERVIEW_BUY_BUTTON)}
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
            iconSize={AvatarSize.Lg}
            onPress={goToSwaps}
            iconStyle={styles.icon}
            containerStyle={styles.containerStyle}
            {...generateTestId(Platform, TOKEN_OVERVIEW_SWAP_BUTTON)}
          />
          <Text variant={TextVariant.BodyMD}>
            {strings('asset_overview.swap')}
          </Text>
        </View>
      )}

      <View style={styles.buttonWrapper}>
        <WalletAction
          iconName={IconName.Bridge}
          iconSize={AvatarSize.Lg}
          onPress={goToBridge}
          iconStyle={styles.icon}
          containerStyle={styles.containerStyle}
          {...generateTestId(Platform, TOKEN_OVERVIEW_BRIDGE_BUTTON)}
        />
        <Text variant={TextVariant.BodyMD}>
          {strings('asset_overview.bridge')}
        </Text>
      </View>
      <View style={styles.buttonWrapper}>
        <WalletAction
          iconName={IconName.Arrow2Upright}
          iconSize={AvatarSize.Lg}
          onPress={onSend}
          iconStyle={styles.icon}
          containerStyle={styles.containerStyle}
          {...generateTestId(Platform, TOKEN_OVERVIEW_SEND_BUTTON)}
        />
        <Text variant={TextVariant.BodyMD}>
          {strings('asset_overview.send_button')}
        </Text>
      </View>
      <View style={styles.buttonWrapper}>
        <WalletAction
          iconName={IconName.QrCode}
          iconSize={AvatarSize.Lg}
          onPress={onReceive}
          iconStyle={styles.icon}
          containerStyle={styles.containerStyle}
          {...generateTestId(Platform, TOKEN_OVERVIEW_RECEIVE_BUTTON)}
        />
        <Text variant={TextVariant.BodyMD}>
          {strings('asset_overview.receive_button')}
        </Text>
      </View>
    </View>
  );
};

export default AssetDetailsActions;
