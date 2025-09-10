import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { Box } from '../../../../../UI/Box/Box';
import {
  isHDOrFirstPartySnapAccount,
  isPrivateKeyAccount,
  areAddressesEqual,
} from '../../../../../../util/address';
import styleSheet from './ExportCredentials.styles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import { TouchableOpacity } from 'react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { useHdKeyringsWithSnapAccounts } from '../../../../../hooks/useHdKeyringsWithSnapAccounts';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  FlexDirection,
  JustifyContent,
  AlignItems,
} from '../../../../../UI/Box/box.types';
import { useStyles } from '../../../../../hooks/useStyles';
import { ExportCredentialsIds } from '../../../../../../../e2e/selectors/MultichainAccounts/ExportCredentials.selectors';
import { KeyringTypes } from '@metamask/keyring-controller';
import { RootState } from '../../../../../../reducers';

interface ExportCredentialsProps {
  account: InternalAccount;
}

export const ExportCredentials = ({ account }: ExportCredentialsProps) => {
  const { navigate } = useNavigation();
  const canExportPrivateKey =
    account.metadata.keyring.type === KeyringTypes.hd ||
    isPrivateKeyAccount(account);
  const canExportMnemonic = isHDOrFirstPartySnapAccount(account);
  const bothOptionsEnabled = canExportPrivateKey && canExportMnemonic;
  const { styles } = useStyles(styleSheet, { bothOptionsEnabled });

  const { seedphraseBackedUp } = useSelector((state: RootState) => state.user);

  const hdKeyringsWithSnapAccounts = useHdKeyringsWithSnapAccounts();
  const srpName = useMemo(() => {
    const keyringIndex = hdKeyringsWithSnapAccounts.findIndex((keyring) =>
      keyring.accounts.find((address) =>
        areAddressesEqual(address, account.address),
      ),
    );

    const name =
      keyringIndex !== -1
        ? `${strings('accounts.secret_recovery_phrase')} ${keyringIndex + 1}`
        : undefined;

    return name;
  }, [hdKeyringsWithSnapAccounts, account]);

  const showSeedphraseBackReminder = useMemo(() => {
    const [primaryKeyring] = hdKeyringsWithSnapAccounts;

    // This would be undefined when the app is locked
    // The keyring controller state is cleared when the app is locked
    if (!primaryKeyring) {
      return false;
    }

    const accountAssociatedWithPrimaryKeyring = primaryKeyring.accounts.find(
      (address) => areAddressesEqual(address, account.address),
    );

    return !seedphraseBackedUp && accountAssociatedWithPrimaryKeyring;
  }, [seedphraseBackedUp, hdKeyringsWithSnapAccounts, account]);

  const onExportMnemonic = useCallback(() => {
    if (account.options.entropySource) {
      navigate(Routes.MODAL.SRP_REVEAL_QUIZ, {
        keyringId: account.options.entropySource,
      });
    }
  }, [navigate, account.options.entropySource]);

  const onExportPrivateKey = useCallback(() => {
    navigate(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS, {
      screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REVEAL_PRIVATE_CREDENTIAL,
      params: { account },
    });
  }, [navigate, account]);

  return (
    <Box data-testid={ExportCredentialsIds.CONTAINER} gap={2}>
      {canExportMnemonic && srpName && (
        <TouchableOpacity
          onPress={onExportMnemonic}
          testID={ExportCredentialsIds.EXPORT_SRP_BUTTON}
        >
          <Box
            style={styles.row}
            flexDirection={FlexDirection.Row}
            justifyContent={JustifyContent.spaceBetween}
            alignItems={AlignItems.center}
          >
            <Text
              variant={TextVariant.BodyMDMedium}
              data-testid={ExportCredentialsIds.SRP_NAME}
            >
              {srpName}
            </Text>
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.flexEnd}
              gap={8}
            >
              {showSeedphraseBackReminder && (
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Error}
                >
                  {strings('multichain_accounts.export_credentials.backup')}
                </Text>
              )}
              <Icon name={IconName.ArrowRight} size={IconSize.Sm} />
            </Box>
          </Box>
        </TouchableOpacity>
      )}
      {canExportPrivateKey && (
        <TouchableOpacity
          onPress={onExportPrivateKey}
          testID={ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON}
        >
          <Box
            style={styles.row}
            flexDirection={FlexDirection.Row}
            justifyContent={JustifyContent.spaceBetween}
            alignItems={AlignItems.center}
          >
            <Text
              variant={TextVariant.BodyMDMedium}
              data-testid={ExportCredentialsIds.PRIVATE_KEY_LINK}
            >
              {strings('multichain_accounts.account_details.private_key')}
            </Text>
            <Icon name={IconName.ArrowRight} size={IconSize.Sm} />
          </Box>
        </TouchableOpacity>
      )}
    </Box>
  );
};
