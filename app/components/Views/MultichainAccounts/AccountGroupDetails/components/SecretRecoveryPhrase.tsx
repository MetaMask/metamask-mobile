import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { Box } from '../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../UI/Box/box.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { useHdKeyringsWithSnapAccounts } from '../../../../hooks/useHdKeyringsWithSnapAccounts';
import Routes from '../../../../../constants/navigation/Routes';
import { RootState } from '../../../../../reducers';
import { areAddressesEqual } from '../../../../../util/address';
import { AccountDetailsIds } from '../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from '../AccountGroupDetails.styles';

export interface SecretRecoveryPhraseProps {
  account: InternalAccount;
}

export const SecretRecoveryPhrase = ({
  account,
}: SecretRecoveryPhraseProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
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
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.SRP_REVEAL_QUIZ,
        keyringId: account.options.entropySource,
      });
    }
  }, [navigation, account?.options.entropySource]);

  return (
    <TouchableOpacity
      style={styles.secretRecoveryPhrase}
      testID={AccountDetailsIds.SECRET_RECOVERY_PHRASE_LINK}
      onPress={onExportMnemonic}
    >
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('multichain_accounts.account_details.secret_recovery_phrase')}
      </Text>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={8}
      >
        {showSeedphraseBackReminder && (
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Error}>
            {strings('multichain_accounts.export_credentials.backup')}
          </Text>
        )}
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={colors.text.alternative}
        />
      </Box>
    </TouchableOpacity>
  );
};
