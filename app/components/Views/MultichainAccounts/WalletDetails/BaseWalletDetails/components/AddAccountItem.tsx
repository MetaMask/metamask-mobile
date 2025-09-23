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
} from '../../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../../locales/i18n';
import { WalletDetailsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/WalletDetails';

interface AddAccountItemProps {
  totalItemsCount: number;
  onPress: () => void;
}

export const AddAccountItem: React.FC<AddAccountItemProps> = ({
  totalItemsCount,
  onPress,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;

  const boxStyles: ViewStyle[] = [styles.addAccountBox];

  if (totalItemsCount > 1) {
    boxStyles.push(styles.lastAccountBox);
  }

  return (
    <TouchableOpacity
      key="add-account"
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
};

export default AddAccountItem;
