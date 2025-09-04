import React, { useCallback, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import BottomSheet, { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
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
import styleSheet from './MultichainEditAccountName.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { useTheme } from '../../../../../util/theme';
import { TextInput } from 'react-native';
import { EditAccountNameIds } from '../../../../../../e2e/selectors/MultichainAccounts/EditAccountName.selectors';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { RootState } from '../../../../../reducers';
import { selectAccountGroupById } from '../../../../../selectors/multichainAccounts/accountTreeController';

interface RootNavigationParamList extends ParamListBase {
  MultichainEditAccountName: {
    accountGroup: AccountGroupObject;
  };
}

type MultichainEditAccountNameRouteProp = RouteProp<
  RootNavigationParamList,
  'MultichainEditAccountName'
>;

export const MultichainEditAccountName = () => {
  const { styles } = useStyles(styleSheet, {});
  const { colors, themeAppearance } = useTheme();
  const route = useRoute<MultichainEditAccountNameRouteProp>();
  const { accountGroup: initialAccountGroup } = route.params;
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);

  const accountGroupFromSelector = useSelector((state: RootState) =>
    initialAccountGroup
      ? selectAccountGroupById(state, initialAccountGroup.id)
      : undefined,
  );

  const accountGroup = accountGroupFromSelector || initialAccountGroup;

  const initialName = accountGroup?.metadata?.name || '';

  const [accountName, setAccountName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  const handleAccountNameChange = useCallback(() => {
    // Validate that account name is not empty
    if (!accountName || accountName.trim() === '') {
      setError(
        strings('multichain_accounts.edit_account_name.error_empty_name'),
      );
      return;
    }

    //TODO: Validate that account name is not duplicate after it's added to the AccountTreeController

    try {
      const { AccountTreeController } = Engine.context;
      AccountTreeController.setAccountGroupName(accountGroup.id, accountName);
      navigation.goBack();
    } catch {
      setError(strings('multichain_accounts.edit_account_name.error'));
    }
  }, [accountName, accountGroup, navigation]);

  const handleOnBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOnClose = useCallback(() => {
    // Close the entire modal stack by going back to the parent
    navigation.dangerouslyGetParent()?.goBack();
  }, [navigation]);

  const saveButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('multichain_accounts.edit_account_name.confirm_button'),
    size: ButtonSize.Lg,
    onPress: handleAccountNameChange,
    style: styles.saveButton,
    testID: EditAccountNameIds.SAVE_BUTTON,
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onBack={handleOnBack} onClose={handleOnClose}>
        {accountGroup?.metadata?.name || 'Account Group'}
      </BottomSheetHeader>
      <Box
        style={styles.container}
        testID={EditAccountNameIds.EDIT_ACCOUNT_NAME_CONTAINER}
      >
        <Text>
          {strings('multichain_accounts.edit_account_name.account_name')}
        </Text>
        <TextInput
          testID={EditAccountNameIds.ACCOUNT_NAME_INPUT}
          style={styles.input}
          value={accountName}
          onChangeText={(newName: string) => {
            setAccountName(newName);
            // Clear error when user starts typing
            if (error) {
              setError(null);
            }
          }}
          placeholder={initialName}
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
