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
import styleSheet from './EditAccountName.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { useTheme } from '../../../../../util/theme';
import Logger from '../../../../../util/Logger';
import { TextInput } from 'react-native';
import { EditAccountNameIds } from '../../../../../../e2e/selectors/MultichainAccounts/EditAccountName.selectors';

type EditAccountNameRouteProp = RouteProp<
  RootParamList,
  'LegacyEditMultichainAccountName'
>;

export const EditAccountName = () => {
  const { styles } = useStyles(styleSheet, {});
  const { colors, themeAppearance } = useTheme();
  const route = useRoute<EditAccountNameRouteProp>();
  const { account } = route.params;
  const navigation = useNavigation();
  const [accountName, setAccountName] = useState(account.metadata.name);
  const [error, setError] = useState<string | null>(null);

  const handleAccountNameChange = useCallback(() => {
    if (!accountName) {
      return;
    }

    const { AccountsController } = Engine.context;
    try {
      AccountsController.setAccountName(account.id, accountName);
      navigation.goBack();
    } catch {
      setError(
        strings('multichain_accounts.edit_account_name.error_duplicate_name'),
      );
    }
  }, [accountName, account.id, navigation]);

  const handleOnBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const saveButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('multichain_accounts.edit_account_name.save_button'),
    size: ButtonSize.Lg,
    onPress: handleAccountNameChange,
    style: styles.saveButton,
    testID: EditAccountNameIds.SAVE_BUTTON,
  };

  return (
    <BottomSheet>
      <BottomSheetHeader onBack={handleOnBack}>
        {strings('multichain_accounts.edit_account_name.title')}
      </BottomSheetHeader>
      <Box
        style={styles.container}
        testID={EditAccountNameIds.EDIT_ACCOUNT_NAME_CONTAINER}
      >
        <Text>{strings('multichain_accounts.edit_account_name.name')}</Text>
        <TextInput
          testID={EditAccountNameIds.ACCOUNT_NAME_INPUT}
          style={styles.input}
          value={accountName}
          onChangeText={(newName: string) => {
            Logger.log('newName', newName);
            setAccountName(newName);
          }}
          placeholder={account.metadata.name}
          placeholderTextColor={colors.text.muted}
          spellCheck={false}
          keyboardAppearance={themeAppearance}
          autoCapitalize="none"
          autoFocus
          editable
        />
        {error && <Text color={TextColor.Error}>{error}</Text>}
      </Box>
      <BottomSheetFooter
        style={styles.footer}
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={[saveButtonProps]}
      />
    </BottomSheet>
  );
};
