import React, { useCallback } from 'react';

import { SwitchAccountModalSelectorIDs } from '../../../../../../components/Views/confirmations/components/modals/switch-account-type-modal/SwitchAccountModal.testIds';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { strings } from '../../../../../../../locales/i18n';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { isEvmAccountType } from '@metamask/keyring-api';
import {
  FlexDirection,
  JustifyContent,
  AlignItems,
} from '../../../../../UI/Box/box.types';
import styleSheet from './SmartAccount.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';

interface SmartAccountDetailsProps {
  account: InternalAccount;
}

export const SmartAccountDetails = ({ account }: SmartAccountDetailsProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const onSmartAccountPress = useCallback(() => {
    navigation.navigate('SmartAccountDetails', { account });
  }, [navigation, account]);

  if (!isEvmAccountType(account.type)) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={onSmartAccountPress}
      testID={SwitchAccountModalSelectorIDs.SMART_ACCOUNT_LINK}
    >
      <Box
        style={styles.container}
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
        alignItems={AlignItems.center}
      >
        <Text variant={TextVariant.BodyMDMedium}>
          {strings('multichain_accounts.account_details.smart_account')}
        </Text>
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          justifyContent={JustifyContent.flexEnd}
          gap={8}
        >
          <Icon name={IconName.ArrowRight} size={IconSize.Sm} />
        </Box>
      </Box>
    </TouchableOpacity>
  );
};
