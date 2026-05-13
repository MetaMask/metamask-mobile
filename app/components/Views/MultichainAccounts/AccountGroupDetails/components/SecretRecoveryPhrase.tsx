import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Box } from '../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../UI/Box/box.types';
import { strings } from '../../../../../../locales/i18n';
import { useHdKeyringsWithSnapAccounts } from '../../../../hooks/useHdKeyringsWithSnapAccounts';
import Routes from '../../../../../constants/navigation/Routes';
import { RootState } from '../../../../../reducers';
import { areAddressesEqual } from '../../../../../util/address';
import { AccountDetailsIds } from '../../AccountDetails.testIds';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from '../AccountGroupDetails.styles';

export interface SecretRecoveryPhraseProps {
  account: InternalAccount;
}

export const SecretRecoveryPhrase = ({
  account,
}: SecretRecoveryPhraseProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { seedphraseBackedUp } = useSelector((state: RootState) => state.user);
  const hdKeyringsWithSnapAccounts = useHdKeyringsWithSnapAccounts();

  const showSeedphraseBackReminder = useMemo(() => {
    const [primaryKeyring] = hdKeyringsWithSnapAccounts;

    if (!primaryKeyring) {
      return false;
    }

    const accountAssociatedWithPrimaryKeyring = primaryKeyring.accounts.find(
      (address) => areAddressesEqual(address, account.address),
    );

    return !seedphraseBackedUp && accountAssociatedWithPrimaryKeyring;
  }, [seedphraseBackedUp, hdKeyringsWithSnapAccounts, account]);

  const onExportMnemonic = useCallback(() => {
    if (account?.options.entropySource) {
      navigation.navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
        shouldUpdateNav: true,
        keyringId: account.options.entropySource,
      });
    }
  }, [navigation, account?.options.entropySource]);

  const handleBackupPressed = useCallback(() => {
    navigation.navigate(Routes.SET_PASSWORD_FLOW.ROOT, {
      screen: Routes.SET_PASSWORD_FLOW.MANUAL_BACKUP_STEP_1,
      params: { backupFlow: true },
    });
  }, [navigation]);

  return (
    <TouchableOpacity
      style={styles.secretRecoveryPhrase}
      testID={AccountDetailsIds.SECRET_RECOVERY_PHRASE_LINK}
      onPress={onExportMnemonic}
    >
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('multichain_accounts.account_details.secret_recovery_phrase')}
      </Text>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={8}
      >
        {showSeedphraseBackReminder && (
          <TouchableOpacity onPress={handleBackupPressed}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('multichain_accounts.export_credentials.backup')}
            </Text>
          </TouchableOpacity>
        )}
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      </Box>
    </TouchableOpacity>
  );
};
