import React from 'react';
import { ViewStyle } from 'react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from '../styles';
import Pressable from '../../../../../../component-library/components-temp/Pressable';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import { Box } from '../../../../../UI/Box/Box';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../UI/AnimatedSpinner';
import { WalletDetailsIds } from '../../WalletDetails.testIds';
import { strings } from '../../../../../../../locales/i18n';

interface AddAccountItemProps {
  index: number;
  totalItemsCount: number;
  isLoading: boolean;
  onPress: () => void;
}

export const AddAccountItem: React.FC<AddAccountItemProps> = ({
  index,
  totalItemsCount,
  isLoading,
  onPress,
}) => {
  const { styles } = useStyles(styleSheet, {});

  const boxStyles: ViewStyle[] = [styles.accountBox];

  if (totalItemsCount > 1) {
    if (index === 0) {
      boxStyles.push(styles.firstAccountBox);
    } else if (index === totalItemsCount - 1) {
      boxStyles.push(styles.lastAccountBox);
    }
  }

  return (
    <Pressable
      testID={WalletDetailsIds.ADD_ACCOUNT_BUTTON}
      onPress={onPress}
      disabled={isLoading}
      style={[
        boxStyles,
        styles.addAccountButton,
        isLoading && styles.addAccountItemDisabled,
      ]}
    >
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.flexStart}
      >
        <Box style={styles.addAccountIconContainer}>
          {isLoading ? (
            <AnimatedSpinner size={SpinnerSize.SM} />
          ) : (
            <Icon
              name={IconName.Add}
              size={IconSize.Md}
              color={IconColor.PrimaryDefault}
            />
          )}
        </Box>
        <Text variant={TextVariant.BodyMd} style={styles.addAccountButtonText}>
          {isLoading
            ? strings('multichain_accounts.wallet_details.creating_account')
            : strings('multichain_accounts.wallet_details.create_account')}
        </Text>
      </Box>
    </Pressable>
  );
};
