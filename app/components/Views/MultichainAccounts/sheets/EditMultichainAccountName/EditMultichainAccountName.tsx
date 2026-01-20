import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootParamList } from '../../../../../types/navigation';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../UI/Box/Box';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import styleSheet from './EditMultichainAccountName.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { useTheme } from '../../../../../util/theme';
import {
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { EditAccountNameIds } from '../EditAccountName.testIds';
import { RootState } from '../../../../../reducers';
import { selectAccountGroupById } from '../../../../../selectors/multichainAccounts/accountTreeController';
import HeaderBase from '../../../../../component-library/components/HeaderBase/HeaderBase';
import ButtonLink from '../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

type EditMultichainAccountNameRouteProp = RouteProp<
  RootParamList,
  'EditMultichainAccountName'
>;

export const EditMultichainAccountName = () => {
  const { styles } = useStyles(styleSheet, {});
  const { colors, themeAppearance } = useTheme();
  const route = useRoute<EditMultichainAccountNameRouteProp>();
  const { accountGroup: initialAccountGroup } = route.params;
  const navigation = useNavigation();

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
    } catch (err: unknown) {
      const errorMessage = err as Error;
      if (errorMessage?.message?.includes('name already exists')) {
        setError(
          strings('multichain_accounts.edit_account_name.error_duplicate_name'),
        );
      } else {
        setError(strings('multichain_accounts.edit_account_name.error'));
      }
    }
  }, [accountName, accountGroup, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBase
        style={styles.header}
        startAccessory={
          <ButtonLink
            labelTextVariant={TextVariant.BodyMDMedium}
            label={<Icon name={IconName.ArrowLeft} size={IconSize.Md} />}
            onPress={() => navigation.goBack()}
          />
        }
      >
        {accountGroup?.metadata?.name || 'Account Group'}
      </HeaderBase>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Box
          style={styles.contentContainer}
          testID={EditAccountNameIds.EDIT_ACCOUNT_NAME_CONTAINER}
        >
          <Text variant={TextVariant.BodyMDMedium}>
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
        <Box style={styles.saveButtonContainer}>
          <Button
            width={ButtonWidthTypes.Full}
            variant={ButtonVariants.Primary}
            label={strings(
              'multichain_accounts.edit_account_name.confirm_button',
            )}
            size={ButtonSize.Lg}
            onPress={handleAccountNameChange}
            testID={EditAccountNameIds.SAVE_BUTTON}
          />
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
