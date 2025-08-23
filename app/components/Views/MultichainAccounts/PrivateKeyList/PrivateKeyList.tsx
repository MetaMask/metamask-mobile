import React, {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { View, TextInput } from 'react-native';
import { useSelector } from 'react-redux';
import { FlashList } from '@shopify/flash-list';
import { KeyringTypes } from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
// Core
import Engine from '../../../../core/Engine';
import ClipboardManager from '../../../../core/ClipboardManager';
// Hooks
import { useStyles } from '../../../hooks/useStyles';
// Selectors
import {
  selectInternalAccountListSpreadByScopesByGroupId,
  selectInternalAccountsByGroupId,
} from '../../../../selectors/multichainAccounts/accounts';
// Components
import MultichainAddressRow from '../../../../component-library/components-temp/MultichainAccounts/MultichainAddressRow';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import Banner, {
  BannerVariant,
  BannerAlertSeverity,
} from '../../../../component-library/components/Banners/Banner';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import {
  useParams,
  createNavigationDetails,
} from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { PrivateKeyListIds } from '../../../../../e2e/selectors/MultichainAccounts/PrivateKeyList.selectors';

import styleSheet from './styles';
import type { Params as PrivateKeyListParams, AddressItem } from './types';

export const createPrivateKeyListNavigationDetails =
  createNavigationDetails<PrivateKeyListParams>(
    Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST,
  );

/**
 * Check if the account has the private key available according to its keyring type.
 * TODO: Add support for KeyringTypes.snap
 *
 * @param account - The internal account to check.
 * @returns True if the private key is available, false otherwise.
 */
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
  const { groupId, title } = useParams<PrivateKeyListParams>();

  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
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
      // Clean state variables on unmount
      setPassword('');
      setWrongPassword(false);
      setReveal(false);
      setPrivateKeys({});
    },
    [],
  );

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
        privateKeyMap[account.address] = pk;
      }),
    );

    setPrivateKeys(privateKeyMap);
  }, [accounts, password]);

  const verifyPasswordAndUnlockKeys = useCallback(async () => {
    const { KeyringController } = Engine.context;
    try {
      await KeyringController.verifyPassword(password);
    } catch (error) {
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
    if (sheetRef.current) {
      sheetRef.current.onCloseBottomSheet();
    }
  }, []);

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
          successMessage: strings(
            'multichain_accounts.private_key_list.copied',
          ),
          callback: async () => {
            await ClipboardManager.setStringExpire(
              privateKeys[item.account.address],
            );
          },
        }}
      />
    ),
    [privateKeys],
  );

  const renderPassword = useCallback(
    () => (
      <>
        <View style={styles.password}>
          <Text
            variant={TextVariant.BodyLGMedium}
            testID={PrivateKeyListIds.PASSWORD_TITLE}
          >
            {strings('multichain_accounts.private_key_list.enter_password')}
          </Text>

          <TextInput
            style={styles.input}
            onChangeText={onPasswordChange}
            placeholder={strings(
              'multichain_accounts.private_key_list.password_placeholder',
            )}
            secureTextEntry
            testID={PrivateKeyListIds.PASSWORD_INPUT}
          />

          {wrongPassword && (
            <Text
              variant={TextVariant.BodyLGMedium}
              color={TextColor.Error}
              testID={PrivateKeyListIds.PASSWORD_ERROR}
            >
              {strings('multichain_accounts.private_key_list.wrong_password')}
            </Text>
          )}
        </View>
        <View style={styles.buttons}>
          <Button
            label={strings('multichain_accounts.private_key_list.cancel')}
            size={ButtonSize.Lg}
            variant={ButtonVariants.Secondary}
            onPress={onCancel}
            style={styles.button}
            testID={PrivateKeyListIds.CANCEL_BUTTON}
          />
          <Button
            label={strings('multichain_accounts.private_key_list.continue')}
            size={ButtonSize.Lg}
            variant={ButtonVariants.Primary}
            onPress={() => verifyPasswordAndUnlockKeys()}
            style={styles.button}
            testID={PrivateKeyListIds.CONTINUE_BUTTON}
          />
        </View>
      </>
    ),
    [
      styles.password,
      styles.input,
      styles.buttons,
      styles.button,
      onPasswordChange,
      wrongPassword,
      onCancel,
      verifyPasswordAndUnlockKeys,
    ],
  );

  const renderPrivateKeyList = useCallback(
    () => (
      <View style={styles.container}>
        <FlashList
          data={filteredAccounts()}
          keyExtractor={(item) => item.scope}
          renderItem={renderAddressItem}
          testID={PrivateKeyListIds.LIST}
        />
      </View>
    ),
    [filteredAccounts, renderAddressItem, styles.container],
  );

  return (
    <BottomSheet style={styles.bottomSheetContent} ref={sheetRef}>
      <Fragment>
        <SheetHeader title={title} />
        <Banner
          variant={BannerVariant.Alert}
          severity={BannerAlertSeverity.Error}
          title={strings('multichain_accounts.private_key_list.warning_title')}
          description={`${strings(
            'multichain_accounts.private_key_list.warning_description',
          )}`}
          style={styles.banner}
          testID={PrivateKeyListIds.BANNER}
        />

        {reveal ? renderPrivateKeyList() : renderPassword()}
      </Fragment>
    </BottomSheet>
  );
};
