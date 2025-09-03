import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from '../styles';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import { Box } from '../../../../../UI/Box/Box';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../UI/AnimatedSpinner';
import { WalletDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/WalletDetails';
import { strings } from '../../../../../../../locales/i18n';

interface AddAccountItemProps {
  index: number;
  totalItemsCount: number;
  isLoading: boolean;
  onPress: () => void;
  isState2Enabled?: boolean;
}

export const AddAccountItem: React.FC<AddAccountItemProps> = ({
  index,
  totalItemsCount,
  isLoading,
  onPress,
  isState2Enabled = false,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;

  // For state 1 (legacy), use the original styling
  if (!isState2Enabled) {
    const boxStyles: ViewStyle[] = [styles.addAccountBox];

    if (totalItemsCount > 1) {
      boxStyles.push(styles.lastAccountBox);
    }

    return (
      <TouchableOpacity
        testID={WalletDetailsIds.ADD_ACCOUNT_BUTTON}
        onPress={onPress}
      >
        <Box
          style={boxStyles}
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          justifyContent={JustifyContent.spaceBetween}
        >
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={8}
          >
            <Icon
              name={IconName.Add}
              size={IconSize.Md}
              color={colors.primary.default}
            />
            <Text
              style={{ color: colors.primary.default }}
              variant={TextVariant.BodyMDMedium}
            >
              {strings('multichain_accounts.wallet_details.create_account')}
            </Text>
          </Box>
        </Box>
      </TouchableOpacity>
    );
  }

  // For state 2, use the new styling with loading state
  const boxStyles: ViewStyle[] = [styles.accountBox];

  if (totalItemsCount > 1) {
    if (index === 0) {
      boxStyles.push(styles.firstAccountBox);
    } else if (index === totalItemsCount - 1) {
      boxStyles.push(styles.lastAccountBox);
    }
  }

  return (
    <TouchableOpacity
      testID={WalletDetailsIds.ADD_ACCOUNT_BUTTON}
      onPress={onPress}
      disabled={isLoading}
      style={[
        boxStyles,
        styles.addAccountButton,
        isLoading && styles.addAccountItemDisabled,
      ]}
      activeOpacity={0.7}
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
              color={IconColor.Primary}
            />
          )}
        </Box>
        <Text variant={TextVariant.BodyMD} style={styles.addAccountButtonText}>
          {isLoading
            ? strings('multichain_accounts.wallet_details.creating_account')
            : strings('multichain_accounts.wallet_details.create_account')}
        </Text>
      </Box>
    </TouchableOpacity>
  );
};

export default AddAccountItem;
