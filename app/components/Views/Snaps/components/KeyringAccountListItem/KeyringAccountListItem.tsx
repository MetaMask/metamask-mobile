///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import React, { useCallback } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { Linking, View } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import stylesheet from './KeyringAccountListItem.styles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import {
  KEYRING_ACCOUNT_LIST_ITEM,
  KEYRING_ACCOUNT_LIST_ITEM_BUTTON,
} from './KeyringAccountListItem.constants';

interface KeyringAccountListItemProps {
  account: InternalAccount;
  blockExplorerUrl: string;
}

const KeyringAccountListItem = ({
  account,
  blockExplorerUrl,
}: KeyringAccountListItemProps) => {
  const { styles } = useStyles(stylesheet, {});

  const handlePress = useCallback(() => {
    Linking.openURL(blockExplorerUrl);
  }, [blockExplorerUrl]);

  return (
    <View testID={KEYRING_ACCOUNT_LIST_ITEM} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.textContent}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            {strings(
              'app_settings.snaps.keyring_account_list_item.account_name',
            )}
          </Text>
          <Text variant={TextVariant.BodyMD}>{account.metadata.name}</Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            {strings(
              'app_settings.snaps.keyring_account_list_item.public_address',
            )}
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.addressText}>
            {toChecksumHexAddress(account.address)}
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <ButtonIcon
            testID={KEYRING_ACCOUNT_LIST_ITEM_BUTTON}
            iconName={IconName.Export}
            iconColor={IconColor.Primary}
            size={ButtonIconSizes.Lg}
            onPress={handlePress}
          />
        </View>
      </View>
    </View>
  );
};

export default React.memo(KeyringAccountListItem);
///: END:ONLY_INCLUDE_IF
