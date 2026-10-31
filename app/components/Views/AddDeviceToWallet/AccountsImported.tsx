import React, { useCallback, useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarAccount,
  AvatarAccountSize,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  ListItem,
  ListItemVariant,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { strings } from '../../../../locales/i18n';
import FooterGlass from '../../../component-library/components-temp/FooterGlass';
import {
  HeaderGlassBackdrop,
  useHeaderGlassInset,
} from '../../../component-library/components-temp/HeaderGlass';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { getAvatarAccountVariant } from '../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import Routes from '../../../constants/navigation/Routes';
import { navigateToQrSyncImport } from '../../../core/QrSync/navigateToQrSyncImport';
import {
  dismissQrSyncAccountsReview,
  useQrSyncAccountsReviewSnapshot,
  clearQrSyncAccountsReview,
} from '../../../core/QrSync/qrSyncAccountsReview';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useMessenger } from '../../../hooks/useMessenger';
import { useNetworkTier } from '../../../hooks/useNetworkTier';
import { selectAvatarAccountType } from '../../../selectors/settings';
import { renderShortAddress } from '../../../util/address';
import { getHardwareTier } from '../../../util/deviceCapability';
import type { RouteMessengerInstance } from './messenger';
import { AccountsImportedTestIds } from './AccountsImported.testIds';

interface AccountsImportedProps {
  /** Back also leaves the QR scanner and returns to Add this device. */
  returnFromScanner?: boolean;
}

type ReviewListItem =
  | { type: 'wallet'; id: string; name: string }
  | { type: 'account'; id: string; name: string; address: string };

const accountsImportedTitle = (accountCount: number): string =>
  strings(
    accountCount === 1
      ? 'app_settings.add_device.accounts_imported_title_one'
      : 'app_settings.add_device.accounts_imported_title_other',
    { accountCount },
  );

const accountsImportedDescription = (
  walletCount: number,
  needsPassword: boolean,
): string => {
  if (walletCount === 1) {
    return strings(
      needsPassword
        ? 'app_settings.add_device.accounts_imported_description_one'
        : 'app_settings.add_device.accounts_imported_description_existing_one',
    );
  }

  return strings(
    needsPassword
      ? 'app_settings.add_device.accounts_imported_description_other'
      : 'app_settings.add_device.accounts_imported_description_existing_other',
    { walletCount },
  );
};

const FOOTER_FADE_HEIGHT = 40;

interface FloatingGlassFooterProps {
  safeAreaBottom: number;
  onLayout: (event: LayoutChangeEvent) => void;
  label: string;
  onPress: () => void;
}

const FloatingGlassFooter = ({
  safeAreaBottom,
  onLayout,
  label,
  onPress,
}: FloatingGlassFooterProps) => {
  const tw = useTailwind();

  return (
    <View
      pointerEvents="box-none"
      onLayout={onLayout}
      style={[
        tw.style('absolute left-0 right-0 bottom-0 z-10'),
        { paddingBottom: safeAreaBottom },
      ]}
    >
      <HeaderGlassBackdrop edge="bottom" />
      <FooterGlass
        twClassName="py-4"
        primaryButtonProps={{
          children: label,
          onPress,
          size: ButtonSize.Lg,
          testID: AccountsImportedTestIds.CONTINUE,
        }}
      />
    </View>
  );
};

const AccountsImported = ({
  returnFromScanner = false,
}: AccountsImportedProps) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const messenger = useMessenger<RouteMessengerInstance>();
  const { review } = useQrSyncAccountsReviewSnapshot();
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const { top: safeAreaTop, bottom: safeAreaBottom } = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const avatarVariant = getAvatarAccountVariant(avatarAccountType);
  const isGlass = networkTier !== 'NONE';
  const { inset: headerInset, onLayout: onHeaderLayout } = useHeaderGlassInset(
    isGlass,
    safeAreaTop,
  );
  const tightenListWindow =
    hardwareTier === 'LOW' ||
    networkTier === 'NONE' ||
    networkTier === 'SLOW_CELLULAR';

  const sections = review?.sections;
  const accountCount =
    sections?.reduce((count, section) => count + section.accounts.length, 0) ??
    0;

  const listData = useMemo<ReviewListItem[]>(() => {
    if (!sections) {
      return [];
    }

    return sections.flatMap((section) => [
      { type: 'wallet' as const, id: section.id, name: section.walletName },
      ...section.accounts.map((account) => ({
        type: 'account' as const,
        id: account.id,
        name: account.name,
        address: account.address,
      })),
    ]);
  }, [sections]);

  const handleBack = useCallback(() => {
    dismissQrSyncAccountsReview();
    Promise.resolve(messenger.call('QrSyncController:resetState')).catch(
      () => undefined,
    );
    if (returnFromScanner) {
      navigation.goBack();
    }
  }, [messenger, navigation, returnFromScanner]);

  const handleContinue = useCallback(() => {
    if (review?.mode === 'existing-user') {
      clearQrSyncAccountsReview();
      navigation.navigate(Routes.WALLET_VIEW);
      return;
    }
    navigateToQrSyncImport(navigation);
  }, [navigation, review?.mode]);

  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    setFooterHeight(event.nativeEvent.layout.height);
  }, []);

  const listContentStyle = useMemo(
    () =>
      isGlass && footerHeight > 0
        ? { paddingBottom: footerHeight + FOOTER_FADE_HEIGHT }
        : undefined,
    [footerHeight, isGlass],
  );

  const renderItem = useCallback<ListRenderItem<ReviewListItem>>(
    ({ item }) => {
      if (item.type === 'wallet') {
        return (
          <Box paddingHorizontal={4} paddingVertical={2}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {item.name}
            </Text>
          </Box>
        );
      }

      return (
        <ListItem
          isInteractive={false}
          variant={ListItemVariant.TwoLines}
          testID={`${AccountsImportedTestIds.ACCOUNT_ROW}-${item.id}`}
          avatar={
            item.address ? (
              <AvatarAccount
                address={item.address}
                variant={avatarVariant}
                size={AvatarAccountSize.Md}
              />
            ) : undefined
          }
          title={item.name}
          description={
            item.address ? renderShortAddress(item.address, 4) : undefined
          }
        />
      );
    },
    [avatarVariant],
  );

  if (!review) {
    return null;
  }

  const continueLabel =
    review.mode === 'existing-user'
      ? strings('app_settings.add_device.done')
      : strings('app_settings.add_device.create_password');

  return (
    <SafeAreaView
      edges={isGlass ? ['left', 'right'] : ['bottom', 'left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={AccountsImportedTestIds.SCREEN}
    >
      <HeaderStandardGlass
        isGlass={isGlass}
        backdrop="static"
        onLayout={onHeaderLayout}
        includesTopInset
        onBack={handleBack}
        backButtonProps={{ testID: AccountsImportedTestIds.BACK }}
      />
      <Box twClassName="flex-1" style={{ marginTop: headerInset }}>
        <TitleStandard
          twClassName="mb-6 px-4"
          title={accountsImportedTitle(accountCount)}
          bottomLabel={accountsImportedDescription(
            review.sections.length,
            review.mode === 'new-user',
          )}
        />
        <Box twClassName="flex-1">
          <FlashList
            data={listData}
            keyExtractor={(item) => item.id}
            getItemType={(item) => item.type}
            renderItem={renderItem}
            drawDistance={tightenListWindow ? 200 : undefined}
            contentContainerStyle={listContentStyle}
            showsVerticalScrollIndicator={false}
          />
        </Box>
      </Box>
      {isGlass ? (
        <FloatingGlassFooter
          safeAreaBottom={safeAreaBottom}
          onLayout={handleFooterLayout}
          label={continueLabel}
          onPress={handleContinue}
        />
      ) : (
        <Box paddingHorizontal={4} paddingBottom={4}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            twClassName="w-full"
            onPress={handleContinue}
            testID={AccountsImportedTestIds.CONTINUE}
          >
            {continueLabel}
          </Button>
        </Box>
      )}
    </SafeAreaView>
  );
};

export default AccountsImported;
