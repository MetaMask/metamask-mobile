import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  HeaderBase,
  IconName,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EditAccountNameIds } from '../EditAccountName.testIds';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { RootState } from '../../../../../reducers';
import { selectAccountGroupById } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { useTheme } from '../../../../../util/theme';

interface RootNavigationParamList extends ParamListBase {
  EditMultichainAccountName: {
    accountGroup: AccountGroupObject;
  };
}

type EditMultichainAccountNameRouteProp = RouteProp<
  RootNavigationParamList,
  'EditMultichainAccountName'
>;

export const EditMultichainAccountName = () => {
  const tw = useTailwind();
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

  const safeAreaStyle = tw.style(
    'flex-1 bg-default',
    Platform.OS === 'android' && StatusBar.currentHeight
      ? { paddingTop: StatusBar.currentHeight }
      : undefined,
  );

  const inputStyle = tw.style(
    'h-10 w-full rounded-lg border-2 border-default p-2.5',
    { color: colors.text.default },
  );

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
    <SafeAreaView style={safeAreaStyle}>
      <HeaderBase
        twClassName="m-4 flex-row items-center justify-center"
        startAccessory={
          <ButtonIcon
            testID={EditAccountNameIds.BACK_BUTTON}
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={() => navigation.goBack()}
          />
        }
      >
        {accountGroup?.metadata?.name || 'Account Group'}
      </HeaderBase>
      <KeyboardAvoidingView
        style={tw.style('flex-1 justify-between')}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          twClassName="mt-4 gap-4 px-6"
          testID={EditAccountNameIds.EDIT_ACCOUNT_NAME_CONTAINER}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('multichain_accounts.edit_account_name.account_name')}
          </Text>
          <TextInput
            testID={EditAccountNameIds.ACCOUNT_NAME_INPUT}
            style={inputStyle}
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
          {error ? <Text color={TextColor.ErrorDefault}>{error}</Text> : null}
        </Box>
        <Box twClassName="mt-4 w-full px-6 py-2.5">
          <Button
            isFullWidth
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleAccountNameChange}
            testID={EditAccountNameIds.SAVE_BUTTON}
          >
            {strings('multichain_accounts.edit_account_name.confirm_button')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
