import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
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
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import type { MoneyNavigationParamList } from '../../types/navigation';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import MoneyDivider from '../MoneyDivider';
import { MoneyPasskeyDetailsSheetTestIds } from './MoneyPasskeyDetailsSheet.testIds';

type DetailsMode = 'details' | 'rename';

const styles = StyleSheet.create({
  safeArea: {
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
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  identityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  usedForDivider: {
    height: 1,
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
  },
});

const MetadataRow = ({ label, value }: { label: string; value: string }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    gap={4}
    twClassName="py-2"
  >
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text variant={TextVariant.BodyMd}>{value}</Text>
  </Box>
);

const UsageRow = ({ label }: { label: string }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={3}
    twClassName="py-2"
  >
    <Icon
      name={IconName.Check}
      size={IconSize.Md}
      color={IconColor.SuccessDefault}
    />
    <Text variant={TextVariant.BodyMd}>{label}</Text>
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
  const { colors } = useTheme();
  const { passkeys, renamePasskey } = useMoneyFinishSetup();
  const passkey = passkeys[route.params.passkeyIndex];
  const [mode, setMode] = useState<DetailsMode>('details');
  const [draftName, setDraftName] = useState(passkey?.name ?? '');

  const handleNameInputLayout = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleBack = useCallback(() => {
    if (mode === 'details') {
      navigation.goBack();
      return;
    }
    setMode('details');
  }, [mode, navigation]);

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

  const createdOn = (passkey.createdAt ?? new Date()).toLocaleDateString(
    'en-US',
    {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
    },
  );
  const headerTitle =
    mode === 'rename'
      ? strings('money.passkey_details.rename_title')
      : strings('money.passkey_details.title');

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
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          twClassName="flex-1 text-center"
        >
          {headerTitle}
        </Text>
        <Box style={styles.headerSpacer} />
      </Box>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mode === 'details' && (
          <>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={3}
              twClassName="pb-4"
            >
              <Box style={styles.identityIcon} twClassName="bg-muted">
                <Icon
                  name={IconName.Key}
                  size={IconSize.Md}
                  color={IconColor.IconDefault}
                />
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={4}
                twClassName="flex-1"
              >
                <Text
                  variant={TextVariant.HeadingSm}
                  fontWeight={FontWeight.Bold}
                  style={styles.passkeyName}
                >
                  {passkey.name}
                </Text>
                <Pressable
                  style={styles.editButton}
                  hitSlop={12}
                  onPress={() => setMode('rename')}
                  accessibilityRole="button"
                  accessibilityLabel={strings('money.passkey_details.rename')}
                  testID={MoneyPasskeyDetailsSheetTestIds.RENAME_BUTTON}
                >
                  <Icon
                    name={IconName.Edit}
                    size={IconSize.Md}
                    color={IconColor.IconAlternative}
                  />
                </Pressable>
              </Box>
            </Box>
            <MetadataRow
              label={strings('money.passkeys.created_on')}
              value={createdOn}
            />
            <MetadataRow
              label={strings('money.passkeys.last_used')}
              value={strings('money.passkeys.today')}
            />

            <MoneyDivider
              color={colors.border.muted}
              style={styles.usedForDivider}
            />
            <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
              {strings('money.passkeys.used_for')}
            </Text>
            <Box twClassName="mt-2">
              <UsageRow label={strings('money.passkeys.wallet_recovery')} />
              <UsageRow
                label={strings('money.passkeys.verifying_transactions')}
              />
            </Box>
          </>
        )}

        {mode === 'rename' && (
          <Box twClassName="gap-4">
            <TextInput
              ref={inputRef}
              onLayout={handleNameInputLayout}
              value={draftName}
              onChangeText={setDraftName}
              autoFocus
              selectTextOnFocus
              style={[
                styles.input,
                {
                  borderColor: colors.border.default,
                  color: colors.text.default,
                  backgroundColor: colors.background.default,
                },
              ]}
              testID={MoneyPasskeyDetailsSheetTestIds.NAME_INPUT}
            />
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
        )}
      </ScrollView>
      {mode === 'details' && (
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
      )}
    </Box>
  );
};

export default MoneyPasskeyDetailsView;
