import React, { useCallback, useState } from 'react';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootParamList } from '../../../../../types/navigation';
import Text, {
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../UI/Box/Box';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { ButtonProps } from '../../../../../component-library/components/Buttons/Button/Button.types';
import styleSheet from './DeleteAccount.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { KeyringTypes } from '@metamask/keyring-controller';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../UI/Box/box.types';
import Routes from '../../../../../constants/navigation/Routes';
import AccountInfo from '../../AccountDetails/components/AccountInfo';
import { MultichainDeleteAccountSelectors } from './DeleteAccount.testIds';
import { removeAccountsFromPermissions } from '../../../../../core/Permissions';
import { toHex } from '@metamask/controller-utils';

type DeleteAccountRouteProp = RouteProp<RootParamList, 'DeleteAccount'>;

export const DeleteAccount = () => {
  const { styles } = useStyles(styleSheet, {});
  const route = useRoute<DeleteAccountRouteProp>();
  const { account } = route.params;
  const navigation = useNavigation();
  const [error, setError] = useState<string | null>(null);

  const canRemoveAccount = account.metadata.keyring.type !== KeyringTypes.hd;

  const handleDeleteAccount = useCallback(async () => {
    const { KeyringController } = Engine.context;

    if (!canRemoveAccount) return;

    try {
      await removeAccountsFromPermissions([toHex(account.address)]);
      await KeyringController.removeAccount(account.address);
      navigation.navigate(Routes.WALLET_VIEW);
    } catch {
      setError(strings('multichain_accounts.delete_account.error'));
    }
  }, [account.address, canRemoveAccount, navigation]);

  const handleOnBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const cancelButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings('multichain_accounts.delete_account.cancel_button'),
    size: ButtonSize.Lg,
    onPress: handleOnBack,
    testID: MultichainDeleteAccountSelectors.DELETE_ACCOUNT_CANCEL_BUTTON,
  };

  const removeButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('multichain_accounts.delete_account.remove_button'),
    size: ButtonSize.Lg,
    onPress: handleDeleteAccount,
    testID: MultichainDeleteAccountSelectors.DELETE_ACCOUNT_REMOVE_BUTTON,
  };

  return (
    <BottomSheet>
      <BottomSheetHeader onBack={handleOnBack}>
        {strings('multichain_accounts.delete_account.title')}
      </BottomSheetHeader>
      <Box
        style={styles.container}
        flexDirection={FlexDirection.Column}
        justifyContent={JustifyContent.flexStart}
        alignItems={AlignItems.center}
        testID={MultichainDeleteAccountSelectors.DELETE_ACCOUNT_CONTAINER}
      >
        <AccountInfo account={account} />
        <BannerAlert
          severity={BannerAlertSeverity.Error}
          title={strings('multichain_accounts.delete_account.warning_title')}
          description={strings(
            'multichain_accounts.delete_account.warning_description',
          )}
          testID={MultichainDeleteAccountSelectors.DELETE_ACCOUNT_WARNING_TITLE}
        />
        {error && <Text color={TextColor.Error}>{error}</Text>}
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={[cancelButtonProps, removeButtonProps]}
      />
    </BottomSheet>
  );
};
