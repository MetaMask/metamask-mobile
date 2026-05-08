import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
  useLayoutEffect,
} from 'react';
import { TextInput, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { FlashList } from '@shopify/flash-list';
import { KeyringTypes } from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  BannerAlert,
  BannerAlertSeverity,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import Engine from '../../../../core/Engine';
import ClipboardManager from '../../../../core/ClipboardManager';
import MultichainAddressRow from '../../../../component-library/components-temp/MultichainAccounts/MultichainAddressRow';
import getHeaderCompactStandardNavbarOptions from '../../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';
import { ToastContext } from '../../../../component-library/components/Toast';
import { strings } from '../../../../../locales/i18n';
import {
  useParams,
  createNavigationDetails,
} from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { PRIVATE_KEY_GUIDE_URL } from '../../../../constants/urls';
import { PrivateKeyListIds } from './PrivateKeyList.testIds';
import type { Params as PrivateKeyListParams, AddressItem } from './types';
import {
  selectInternalAccountListSpreadByScopesByGroupId,
  selectInternalAccountsByGroupId,
} from '../../../../selectors/multichainAccounts/accounts';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { useTheme } from '../../../../util/theme';

export const createPrivateKeyListNavigationDetails =
  createNavigationDetails<PrivateKeyListParams>(
    Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST,
  );

const hasPrivateKeyAvailable = (account: InternalAccount) =>
  account.metadata.keyring.type === KeyringTypes.hd ||
  account.metadata.keyring.type === KeyringTypes.simple;

/**
 * AddressList component displays a list of addresses spread by scopes.
 *
 * @param props - Component properties.
 * @returns {JSX.Element} The rendered component.
 */
export const PrivateKeyList = () => {
  const navigation = useNavigation();
  const { groupId, title } = useParams<PrivateKeyListParams>();
  const tw = useTailwind();
  const theme = useTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();

  const { toastRef } = useContext(ToastContext);
  const [password, setPassword] = useState<string>('');
  const [wrongPassword, setWrongPassword] = useState<boolean>(false);
  const [reveal, setReveal] = useState<boolean>(false);
  const [privateKeys, setPrivateKeys] = useState<Record<string, string>>({});

  const getInternalAccountsByGroupId = useSelector(
    selectInternalAccountsByGroupId,
  );
  const accounts = getInternalAccountsByGroupId(groupId);

  const selectInternalAccountsSpreadByScopes = useSelector(
    selectInternalAccountListSpreadByScopesByGroupId,
  );
  const internalAccountsSpreadByScopes =
    selectInternalAccountsSpreadByScopes(groupId);

  useEffect(
    () => () => {
      setPassword('');
      setWrongPassword(false);
      setReveal(false);
      setPrivateKeys({});
    },
    [],
  );

  useEffect(() => {
    if (reveal) {
      trace({
        name: TraceName.ShowAccountPrivateKeyList,
        op: TraceOperation.AccountUi,
      });
    }
  }, [reveal]);

  const onPasswordChange = useCallback((pswd: string) => {
    setPassword(pswd);
  }, []);

  const unlockPrivateKeys = useCallback(async () => {
    const { KeyringController } = Engine.context;
    const pkAccounts = accounts.filter((account: InternalAccount) =>
      hasPrivateKeyAvailable(account),
    );

    const privateKeyMap: Record<string, string> = {};
    await Promise.all(
      pkAccounts.map(async (account: InternalAccount) => {
        const pk = await KeyringController.exportAccount(
          password,
          account.address,
        );
        privateKeyMap[account.id] = pk;
      }),
    );

    setPrivateKeys(privateKeyMap);
  }, [accounts, password]);

  const verifyPasswordAndUnlockKeys = useCallback(async () => {
    const { KeyringController } = Engine.context;
    try {
      await KeyringController.verifyPassword(password);
    } catch {
      setWrongPassword(true);
      setReveal(false);
      setPrivateKeys({});
      return;
    }

    await unlockPrivateKeys();
    setWrongPassword(false);
    setReveal(true);
  }, [password, unlockPrivateKeys]);

  const onCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useLayoutEffect(() => {
    if (title) {
      navigation.setOptions({
        ...getHeaderCompactStandardNavbarOptions({
          title,
          onBack: () => navigation.goBack(),
          backButtonProps: { testID: PrivateKeyListIds.GO_BACK },
          includesTopInset: true,
        }),
        headerShown: true,
      });
    }
  }, [navigation, title]);

  const filteredAccounts = useCallback(
    () =>
      internalAccountsSpreadByScopes.filter((item: AddressItem) =>
        hasPrivateKeyAvailable(item.account),
      ),
    [internalAccountsSpreadByScopes],
  );

  const renderAddressItem = useCallback(
    ({ item }: { item: AddressItem }) => (
      <MultichainAddressRow
        chainId={item.scope}
        networkName={item.networkName}
        address={item.account.address}
        copyParams={{
          toastMessage: strings('multichain_accounts.private_key_list.copied'),
          toastRef,
          callback: async () => {
            await ClipboardManager.setStringExpire(
              privateKeys[item.account.id],
            );
          },
        }}
      />
    ),
    [privateKeys, toastRef],
  );

  const privateKeyBannerDescription = useMemo(
    () => (
      <Text variant={TextVariant.BodyMd}>
        {`${strings(
          'multichain_accounts.private_key_list.warning_description',
        )} `}
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.PrimaryDefault}
          onPress={() => Linking.openURL(PRIVATE_KEY_GUIDE_URL)}
        >
          {strings('reveal_credential.learn_more')}
        </Text>
      </Text>
    ),
    [],
  );

  const passwordFooterPaddingBottom = Math.max(bottomInset, 16);

  const renderPassword = useCallback(
    () => (
      <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1">
        <Box twClassName="flex-1 px-4 pt-6">
          <Text
            variant={TextVariant.BodyLg}
            testID={PrivateKeyListIds.PASSWORD_TITLE}
          >
            {strings('multichain_accounts.private_key_list.enter_password')}
          </Text>

          <TextInput
            style={tw.style(
              'mt-2 rounded-lg border border-border-default bg-background-default px-4 py-4 text-xl text-text-default',
            )}
            onChangeText={onPasswordChange}
            placeholder={strings(
              'multichain_accounts.private_key_list.password_placeholder',
            )}
            placeholderTextColor={theme.colors.text.muted}
            secureTextEntry
            autoCapitalize="none"
            testID={PrivateKeyListIds.PASSWORD_INPUT}
          />

          {wrongPassword && (
            <Text
              variant={TextVariant.BodyLg}
              color={TextColor.ErrorDefault}
              testID={PrivateKeyListIds.PASSWORD_ERROR}
            >
              {strings('multichain_accounts.private_key_list.wrong_password')}
            </Text>
          )}
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Evenly}
          style={{ paddingBottom: passwordFooterPaddingBottom }}
          twClassName="w-full shrink-0 border-t border-border-muted px-4 pt-4"
        >
          <Box twClassName="mx-2 flex-1">
            <Button
              size={ButtonSize.Lg}
              variant={ButtonVariant.Secondary}
              onPress={onCancel}
              twClassName="w-full"
              testID={PrivateKeyListIds.CANCEL_BUTTON}
            >
              {strings('multichain_accounts.private_key_list.cancel')}
            </Button>
          </Box>
          <Box twClassName="mx-2 flex-1">
            <Button
              size={ButtonSize.Lg}
              variant={ButtonVariant.Primary}
              onPress={() => verifyPasswordAndUnlockKeys()}
              twClassName="w-full"
              testID={PrivateKeyListIds.CONTINUE_BUTTON}
            >
              {strings('multichain_accounts.private_key_list.continue')}
            </Button>
          </Box>
        </Box>
      </Box>
    ),
    [
      tw,
      theme.colors.text.muted,
      onPasswordChange,
      wrongPassword,
      onCancel,
      verifyPasswordAndUnlockKeys,
      passwordFooterPaddingBottom,
    ],
  );

  const renderPrivateKeyList = useCallback(
    () => (
      <Box twClassName="flex-1 p-4">
        <FlashList
          data={filteredAccounts()}
          keyExtractor={(item) => item.scope}
          renderItem={renderAddressItem}
          testID={PrivateKeyListIds.LIST}
          onLoad={() => {
            endTrace({ name: TraceName.ShowAccountPrivateKeyList });
          }}
        />
      </Box>
    ),
    [filteredAccounts, renderAddressItem],
  );

  return (
    <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1">
      <BannerAlert
        severity={BannerAlertSeverity.Danger}
        title={strings('multichain_accounts.private_key_list.warning_title')}
        description={privateKeyBannerDescription}
        twClassName="mx-[10px]"
        testID={PrivateKeyListIds.BANNER}
      />

      {reveal ? renderPrivateKeyList() : renderPassword()}
    </Box>
  );
};
