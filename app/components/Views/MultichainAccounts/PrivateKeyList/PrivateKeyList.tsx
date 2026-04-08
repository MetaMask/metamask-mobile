import React, {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useContext,
  forwardRef,
} from 'react';
import {
  View,
  TextInput,
  Linking,
  Platform,
  ScrollViewProps,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
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
import { ToastContext } from '../../../../component-library/components/Toast';
import Banner, {
  BannerVariant,
  BannerAlertSeverity,
} from '../../../../component-library/components/Banners/Banner';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonVariant,
  ButtonBaseSize,
} from '@metamask/design-system-react-native';
import {
  useParams,
  createNavigationDetails,
} from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { PRIVATE_KEY_GUIDE_URL } from '../../../../constants/urls';
import { PrivateKeyListIds } from './PrivateKeyList.testIds';

import styleSheet from './styles';
import type { Params as PrivateKeyListParams, AddressItem } from './types';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';

export const createPrivateKeyListNavigationDetails =
  createNavigationDetails<PrivateKeyListParams>(
    Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST,
  );

/**
 * Shared context that lets the module-level GestureScrollComponent write back
 * the RNGH ScrollView ref to its PrivateKeyList ancestor, which then passes it
 * to BottomSheet via `panGestureHandlerProps.simultaneousHandlers` on Android.
 */
const GestureScrollRefContext = React.createContext<
  React.MutableRefObject<React.ComponentRef<typeof ScrollView> | null>
>({ current: null });

/**
 * Stable RNGH-backed scroll component for FlashList.
 *
 * Defined at module level (not inside PrivateKeyList) to satisfy the
 * react/no-unstable-nested-components rule. Uses forwardRef so FlashList can
 * properly forward its internal scroll ref — plain function components have
 * their ref prop stripped by React 18's reconciler. Also reads
 * GestureScrollRefContext to populate the parent's flashListScrollGestureRef,
 * which BottomSheet uses via panGestureHandlerProps on Android so that scroll
 * gestures are not captured as dismiss-sheet pans.
 */
const GestureScrollComponent = forwardRef<
  React.ComponentRef<typeof ScrollView>,
  ScrollViewProps
>((props, ref) => {
  const scrollGestureRef = useContext(GestureScrollRefContext);
  return (
    <ScrollView
      {...props}
      ref={(node) => {
        scrollGestureRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<typeof node | null>).current = node;
        }
      }}
    />
  );
});

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
  const { toastRef } = useContext(ToastContext);
  const sheetRef = useRef<BottomSheetRef>(null);
  /**
   * Ref to FlashList's RNGH ScrollView; passed via `panGestureHandlerProps.simultaneousHandlers`
   * on Android so list scrolling is not captured by the sheet dismiss pan.
   */
  const flashListScrollGestureRef = useRef<React.ComponentRef<
    typeof ScrollView
  > | null>(null);
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

  // Start tracing the private key list display only after the password is
  // entered and verified.
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
            autoCapitalize="none"
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
            size={ButtonBaseSize.Lg}
            variant={ButtonVariant.Secondary}
            onPress={onCancel}
            style={styles.button}
            testID={PrivateKeyListIds.CANCEL_BUTTON}
          >
            {strings('multichain_accounts.private_key_list.cancel')}
          </Button>
          <Button
            size={ButtonBaseSize.Lg}
            variant={ButtonVariant.Primary}
            onPress={() => verifyPasswordAndUnlockKeys()}
            style={styles.button}
            testID={PrivateKeyListIds.CONTINUE_BUTTON}
          >
            {strings('multichain_accounts.private_key_list.continue')}
          </Button>
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
          renderScrollComponent={GestureScrollComponent}
          testID={PrivateKeyListIds.LIST}
          onLoad={() => {
            endTrace({ name: TraceName.ShowAccountPrivateKeyList });
          }}
        />
      </View>
    ),
    [filteredAccounts, renderAddressItem, styles.container],
  );

  const privateKeyBannerDescription = useMemo(
    () => (
      <Text>
        {`${strings(
          'multichain_accounts.private_key_list.warning_description',
        )} `}
        <Text
          color={TextColor.Primary}
          onPress={() => Linking.openURL(PRIVATE_KEY_GUIDE_URL)}
        >
          {strings('reveal_credential.learn_more')}
        </Text>
      </Text>
    ),
    [],
  );

  return (
    <GestureScrollRefContext.Provider value={flashListScrollGestureRef}>
      <BottomSheet
        style={styles.bottomSheetContent}
        ref={sheetRef}
        panGestureHandlerProps={
          Platform.OS === 'android'
            ? { simultaneousHandlers: flashListScrollGestureRef }
            : undefined
        }
      >
        <Fragment>
          <SheetHeader title={title} />
          <Banner
            variant={BannerVariant.Alert}
            severity={BannerAlertSeverity.Error}
            title={strings(
              'multichain_accounts.private_key_list.warning_title',
            )}
            description={privateKeyBannerDescription}
            style={styles.banner}
            testID={PrivateKeyListIds.BANNER}
          />

          {reveal ? renderPrivateKeyList() : renderPassword()}
        </Fragment>
      </BottomSheet>
    </GestureScrollRefContext.Provider>
  );
};
