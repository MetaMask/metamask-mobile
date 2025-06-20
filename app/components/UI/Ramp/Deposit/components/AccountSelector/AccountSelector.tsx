import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useAccountName } from '../../../../../hooks/useAccountName';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { createAccountSelectorNavDetails } from '../../../../../Views/AccountSelector';
import { type RootState } from '../../../../../../reducers';
import { Theme } from '../../../../../../util/theme/models';
import { useStyles } from '../../../../../../component-library/hooks/useStyles';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';

const stylesheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    selector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.background.default,
      borderRadius: 12,
      padding: 8,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      alignSelf: 'flex-start',
    },
  });
};

const AccountSelector = () => {
  const navigation = useNavigation();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const accountName = useAccountName();
  const { styles, theme } = useStyles(stylesheet, {});

  const accountAvatarType = useSelector((state: RootState) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const selectedFormattedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const openAccountSelector = useCallback(
    () =>
      navigation.navigate(
        ...createAccountSelectorNavDetails({
          disablePrivacyMode: true,
          isEvmOnly: true,
        }),
      ),
    [navigation],
  );

  return (
    <TouchableOpacity onPress={openAccountSelector} style={styles.selector}>
      {selectedAddress && selectedFormattedAddress ? (
        <>
          <Avatar
            variant={AvatarVariant.Account}
            type={accountAvatarType}
            accountAddress={selectedAddress}
            size={AvatarSize.Sm}
          />
          <Text
            variant={TextVariant.BodyMD}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {accountName}
          </Text>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={theme.colors.icon.alternative}
          />
        </>
      ) : (
        <Text variant={TextVariant.BodyMD}>Account is loading...</Text>
      )}
    </TouchableOpacity>
  );
};

export default AccountSelector;
