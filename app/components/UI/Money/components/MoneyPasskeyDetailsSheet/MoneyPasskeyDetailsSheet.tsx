import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import type { MoneyNavigationParamList } from '../../types/navigation';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import { formatMoneySecurityMethodDate } from '../../utils/formatMoneySecurityMethodAddedAt';
import { MoneyPasskeyDetailsSheetTestIds } from './MoneyPasskeyDetailsSheet.testIds';

type DetailsMode = 'details' | 'rename';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  renameFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  editButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyName: {
    flexShrink: 1,
  },
  usageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
  },
});

// Prototype-only native iOS keyboard colors have no design-token equivalent.
/* eslint-disable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */
const createKeyboardStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: isDark ? '#1C1C1E' : '#D1D3D9',
      paddingHorizontal: 4,
      paddingTop: 8,
    },
    row: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 8,
    },
    middleRow: {
      paddingHorizontal: 16,
    },
    key: {
      flex: 1,
      height: 42,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#575759' : '#FFFFFF',
    },
    specialKey: {
      width: 46,
      height: 42,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#3A3A3C' : '#ADB3BC',
    },
    numberKey: {
      width: 68,
    },
    returnKey: {
      width: 76,
    },
    spaceKey: {
      flex: 1,
    },
    keyText: {
      color: isDark ? '#FFFFFF' : '#000000',
      fontSize: 18,
    },
    specialKeyText: {
      color: isDark ? '#FFFFFF' : '#000000',
      fontSize: 14,
    },
  });
/* eslint-enable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */

const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
] as const;

const PrototypeKeyboard = ({
  isDark,
  onKeyPress,
  onBackspace,
  onSubmit,
  bottomInset,
}: {
  isDark: boolean;
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  bottomInset: number;
}) => {
  const keyboardStyles = createKeyboardStyles(isDark);

  return (
    <Box
      style={[
        keyboardStyles.container,
        { paddingBottom: Math.max(bottomInset, 8) },
      ]}
      testID={MoneyPasskeyDetailsSheetTestIds.KEYBOARD}
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <Box
          key={row.join('')}
          style={[
            keyboardStyles.row,
            rowIndex === 1 && keyboardStyles.middleRow,
          ]}
        >
          {row.map((key) => (
            <Pressable
              key={key}
              style={keyboardStyles.key}
              onPress={() => onKeyPress(key)}
              testID={`money-passkey-keyboard-key-${key}`}
            >
              <Text style={keyboardStyles.keyText}>{key.toUpperCase()}</Text>
            </Pressable>
          ))}
        </Box>
      ))}
      <Box style={keyboardStyles.row}>
        <Pressable style={keyboardStyles.specialKey}>
          <Text style={keyboardStyles.keyText}>⇧</Text>
        </Pressable>
        {['z', 'x', 'c', 'v', 'b', 'n', 'm'].map((key) => (
          <Pressable
            key={key}
            style={keyboardStyles.key}
            onPress={() => onKeyPress(key)}
            testID={`money-passkey-keyboard-key-${key}`}
          >
            <Text style={keyboardStyles.keyText}>{key.toUpperCase()}</Text>
          </Pressable>
        ))}
        <Pressable
          style={keyboardStyles.specialKey}
          onPress={onBackspace}
          testID="money-passkey-keyboard-backspace"
        >
          <Text style={keyboardStyles.keyText}>⌫</Text>
        </Pressable>
      </Box>
      <Box style={keyboardStyles.row}>
        <Pressable
          style={[keyboardStyles.specialKey, keyboardStyles.numberKey]}
        >
          <Text style={keyboardStyles.specialKeyText}>123</Text>
        </Pressable>
        <Pressable
          style={[keyboardStyles.key, keyboardStyles.spaceKey]}
          onPress={() => onKeyPress(' ')}
          testID="money-passkey-keyboard-space"
        >
          <Text style={keyboardStyles.specialKeyText}>space</Text>
        </Pressable>
        <Pressable
          style={[keyboardStyles.specialKey, keyboardStyles.returnKey]}
          onPress={onSubmit}
        >
          <Text style={keyboardStyles.specialKeyText}>return</Text>
        </Pressable>
      </Box>
    </Box>
  );
};

const UsageRow = ({ icon, label }: { icon: IconName; label: string }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={3}
    twClassName="py-2"
  >
    <Box style={styles.usageIcon} twClassName="bg-muted">
      <Icon name={icon} size={IconSize.Md} color={IconColor.IconAlternative} />
    </Box>
    <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
      {label}
    </Text>
  </Box>
);

const MetadataRow = ({ title, value }: { title: string; value: string }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    gap={4}
    twClassName="py-2"
  >
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Regular}
      color={TextColor.TextAlternative}
    >
      {title}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Regular}
      twClassName="flex-1 text-right"
    >
      {value}
    </Text>
  </Box>
);

const MoneyPasskeyDetailsView = () => {
  const inputRef = useRef<TextInput>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<MoneyNavigationParamList, 'MoneyPasskeyDetails'>>();
  const insets = useSafeAreaInsets();
  const footerStyle = [
    styles.footer,
    { paddingBottom: Math.max(insets.bottom, 16) },
  ];
  const { themeAppearance } = useTheme();
  const { passkeys, renamePasskey } = useMoneyFinishSetup();
  const { isSocialLogin } = useMoneySecurityMethods();
  const passkey = passkeys[route.params.passkeyIndex];
  const [mode, setMode] = useState<DetailsMode>('details');
  const [draftName, setDraftName] = useState(passkey?.name ?? '');

  const handleCancelRename = useCallback(() => {
    setDraftName(passkey?.name ?? '');
    setMode('details');
  }, [passkey?.name]);

  const handleBack = useCallback(() => {
    if (mode === 'details') {
      navigation.goBack();
      return;
    }
    handleCancelRename();
  }, [handleCancelRename, mode, navigation]);

  const handleRename = useCallback(() => {
    if (!draftName.trim()) {
      return;
    }
    renamePasskey(route.params.passkeyIndex, draftName);
    setMode('details');
  }, [draftName, renamePasskey, route.params.passkeyIndex]);

  const handleDeletePress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.DELETE_PASSKEY_SHEET,
      params: { passkeyIndex: route.params.passkeyIndex },
    });
  }, [navigation, route.params.passkeyIndex]);

  const handleEditPress = useCallback(() => {
    setDraftName(passkey?.name ?? '');
    setMode('rename');
  }, [passkey?.name]);

  const handleKeyboardKeyPress = useCallback((key: string) => {
    setDraftName((currentName) => `${currentName}${key}`.slice(0, 64));
  }, []);

  const handleKeyboardBackspace = useCallback(() => {
    setDraftName((currentName) => currentName.slice(0, -1));
  }, []);

  useEffect(() => {
    if (mode !== 'rename') {
      return undefined;
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [mode]);

  if (!passkey) {
    return null;
  }

  const createdAt = formatMoneySecurityMethodDate(
    passkey.createdAt ?? new Date(),
  );

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID={MoneyPasskeyDetailsSheetTestIds.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-1 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBack}
          accessibilityLabel={strings('money.security.back')}
          testID={MoneyPasskeyDetailsSheetTestIds.BACK_BUTTON}
        />
        {mode === 'rename' ? (
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Bold}
            twClassName="flex-1 text-center"
          >
            {strings('money.passkey_details.rename_title')}
          </Text>
        ) : (
          <Box twClassName="flex-1" />
        )}
        <Box style={styles.headerSpacer} />
      </Box>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <>
            {mode === 'details' ? (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
              >
                <Text
                  variant={TextVariant.HeadingLg}
                  fontWeight={FontWeight.Bold}
                  style={styles.passkeyName}
                  twClassName="flex-1"
                >
                  {passkey.name}
                </Text>
                <Pressable
                  style={styles.editButton}
                  hitSlop={12}
                  onPress={handleEditPress}
                  accessibilityRole="button"
                  accessibilityLabel={strings('money.passkey_details.rename')}
                  testID={MoneyPasskeyDetailsSheetTestIds.RENAME_BUTTON}
                >
                  <Icon
                    name={IconName.Edit}
                    size={IconSize.Lg}
                    color={IconColor.IconDefault}
                  />
                </Pressable>
              </Box>
            ) : (
              <TextField
                ref={inputRef}
                value={draftName}
                onChangeText={setDraftName}
                autoFocus
                inputProps={{
                  autoCapitalize: 'sentences',
                  autoCorrect: false,
                  returnKeyType: 'done',
                  onSubmitEditing: handleRename,
                  showSoftInputOnFocus: false,
                  testID: MoneyPasskeyDetailsSheetTestIds.NAME_INPUT,
                  accessibilityLabel: strings('money.passkey_details.rename'),
                }}
              />
            )}

            {mode === 'details' && (
              <>
                <Box twClassName="mt-4">
                  <MetadataRow
                    title={strings('money.passkey_details.created_date')}
                    value={createdAt}
                  />
                  <MetadataRow
                    title={strings('money.passkeys.last_used')}
                    value={strings('money.passkeys.today')}
                  />
                </Box>

                <Box
                  style={styles.rowDivider}
                  twClassName="mt-4 bg-border-muted"
                />

                <Text
                  variant={TextVariant.HeadingSm}
                  fontWeight={FontWeight.Bold}
                  twClassName="mt-4 mb-2"
                >
                  {strings('money.passkeys.used_for')}
                </Text>
                <Box>
                  {isSocialLogin && (
                    <>
                      <UsageRow
                        icon={IconName.Lock}
                        label={strings('money.passkeys.wallet_recovery')}
                      />
                      <Box
                        style={styles.rowDivider}
                        twClassName="bg-border-muted"
                      />
                    </>
                  )}
                  <UsageRow
                    icon={IconName.SecurityTick}
                    label={strings('money.passkeys.verifying_transactions')}
                  />
                </Box>
              </>
            )}
          </>
        </ScrollView>
        {mode === 'details' ? (
          <Box style={footerStyle}>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleDeletePress}
              testID={MoneyPasskeyDetailsSheetTestIds.DELETE_BUTTON}
              twClassName="bg-muted"
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.ErrorDefault}
                fontWeight={FontWeight.Medium}
              >
                {strings('money.passkey_details.delete')}
              </Text>
            </Button>
          </Box>
        ) : (
          <>
            <Box style={styles.renameFooter}>
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                isDisabled={!draftName.trim()}
                onPress={handleRename}
                testID={MoneyPasskeyDetailsSheetTestIds.SAVE_BUTTON}
              >
                {strings('money.passkey_details.save')}
              </Button>
            </Box>
            <PrototypeKeyboard
              isDark={themeAppearance === 'dark'}
              onKeyPress={handleKeyboardKeyPress}
              onBackspace={handleKeyboardBackspace}
              onSubmit={handleRename}
              bottomInset={insets.bottom}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </Box>
  );
};

export default MoneyPasskeyDetailsView;
