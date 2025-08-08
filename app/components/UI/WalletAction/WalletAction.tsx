// Third party dependencies.
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { lightTheme } from '@metamask/design-tokens';

// External dependencies.
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { strings } from '../../../../locales/i18n';

// Internal dependencies.
import {
  WalletActionDetail,
  WalletActionProps,
  WalletActionType,
} from './WalletAction.types';
import styleSheet from './WalletAction.styles';
import Avatar, {
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';

const WalletAction = ({
  actionType,
  iconName,
  iconSize,
  onPress,
  containerStyle,
  iconStyle,
  actionID,
  disabled,
  ...props
}: WalletActionProps) => {
  const walletActionDetails: Record<WalletActionType, WalletActionDetail> = {
    [WalletActionType.Buy]: {
      title: strings('fund_actionmenu.buy'),
      description: strings('fund_actionmenu.buy_description'),
    },
    [WalletActionType.Sell]: {
      title: strings('fund_actionmenu.sell'),
      description: strings('fund_actionmenu.sell_description'),
    },
    [WalletActionType.Deposit]: {
      title: strings('fund_actionmenu.deposit'),
      description: strings('fund_actionmenu.deposit_description'),
    },
    [WalletActionType.Swap]: {
      title: strings('asset_overview.swap'),
      description: strings('asset_overview.swap_description'),
    },
    [WalletActionType.Bridge]: {
      title: strings('asset_overview.bridge'),
      description: strings('asset_overview.bridge_description'),
    },
    [WalletActionType.Send]: {
      title: strings('asset_overview.send_button'),
      description: strings('asset_overview.send_description'),
    },
    [WalletActionType.Receive]: {
      title: strings('asset_overview.receive_button'),
      description: strings('asset_overview.receive_description'),
    },
    [WalletActionType.Earn]: {
      title: strings('asset_overview.earn_button'),
      description: strings('asset_overview.earn_description'),
    },
    [WalletActionType.Perps]: {
      title: strings('asset_overview.perps_button'),
      description: strings('asset_overview.perps_description'),
    },
  };

  const actionStrings = actionType ? walletActionDetails[actionType] : null;
  const actionTitle = actionStrings?.title ?? '';
  const actionDescription = actionStrings?.description;
  const { colors } = lightTheme;
  const { styles } = useStyles(styleSheet, {});

  const touchableStyles = [
    styles.base,
    containerStyle,
    disabled && styles.disabled,
  ];

  return (
    <TouchableOpacity
      style={touchableStyles}
      onPress={onPress}
      testID={actionID}
      disabled={disabled}
      {...props}
    >
      <Avatar
        variant={AvatarVariant.Icon}
        style={iconStyle}
        size={iconSize}
        name={iconName}
        backgroundColor={colors.primary.default}
        iconColor={colors.background.default}
      />
      <View>
        <Text variant={TextVariant.BodyLGMedium}>{actionTitle}</Text>
        <Text variant={TextVariant.BodyMD} style={styles.descriptionLabel}>
          {actionDescription}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default WalletAction;
