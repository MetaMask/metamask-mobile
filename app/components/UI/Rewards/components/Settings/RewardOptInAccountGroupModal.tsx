import React, {
  useCallback,
  useRef,
  useMemo,
  useEffect,
  useContext,
} from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { strings } from '../../../../../../locales/i18n';
import { AccountGroupId } from '@metamask/account-api';
import { useLinkAccountGroup } from '../../hooks/useLinkAccountGroup';
import { renderSlightlyLongAddress } from '../../../../../util/address';
import NetworkAvatars from './NetworkAvatars';
import { useRewardOptinSummary } from '../../hooks/useRewardOptinSummary';

interface RewardOptInAccountGroupModalProps {
  accountGroupId: AccountGroupId;
  onClose: () => void;
  autoLink?: boolean; // Auto-start linking unlinked accounts when modal opens
}

interface AddressItem {
  address: string;
  hasOptedIn: boolean;
  scopes: string[];
}

const RewardOptInAccountGroupModal: React.FC<
  RewardOptInAccountGroupModalProps
> = ({ accountGroupId, onClose, autoLink = false }) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { toastRef } = useContext(ToastContext);
  const { byWallet } = useRewardOptinSummary();

  const accountGroup = useMemo(
    () =>
      byWallet
        .find((wallet) =>
          wallet.groups.some((group) => group.id === accountGroupId),
        )
        ?.groups.find((group) => group.id === accountGroupId),
    [byWallet, accountGroupId],
  );

  // Link account group hook
  const {
    linkAccountGroup,
    isLoading: isLinking,
    progress,
    cancelLinking,
  } = useLinkAccountGroup();

  const handleDismiss = useCallback(() => {
    // Cancel linking if in progress
    if (isLinking) {
      cancelLinking();
    }
    onClose();
  }, [onClose, isLinking, cancelLinking]);

  // Auto-link effect
  useEffect(() => {
    if (!accountGroup) return;
    if (autoLink && accountGroup.optedOutAccounts.length > 0 && !progress) {
      const startLinking = async () => {
        const linkStatusReport = await linkAccountGroup(accountGroup.id);

        // Update toast with result
        if (linkStatusReport.success) {
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            iconName: IconName.Check,
            iconColor: IconColor.Success,
            labelOptions: [
              {
                label: strings('rewards.link_account_success', {
                  accountName: accountGroup.name,
                }),
                isBold: true,
              },
            ],
            hasNoTimeout: false,
          });
        } else {
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            iconName: IconName.CircleX,
            iconColor: IconColor.Error,
            labelOptions: [
              {
                label: strings('rewards.link_account_error', {
                  accountName: accountGroup.name,
                }),
                isBold: true,
              },
            ],
            hasNoTimeout: false,
          });
        }
      };

      startLinking();
    }
  }, [autoLink, accountGroup, linkAccountGroup, toastRef, progress]);

  // Prepare address data grouped by linked/unlinked status
  const addressData = useMemo(() => {
    if (!accountGroup) return [];
    const linkedAddresses: AddressItem[] = accountGroup.optedInAccounts.map(
      (account) => ({
        address: account.address,
        hasOptedIn: true,
        scopes: account.scopes || [],
      }),
    );

    const unlinkedAddresses: AddressItem[] = accountGroup.optedOutAccounts.map(
      (account) => ({
        address: account.address,
        hasOptedIn: false,
        scopes: account.scopes || [],
      }),
    );

    return [...linkedAddresses, ...unlinkedAddresses];
  }, [accountGroup]);

  const renderAddressItem = useCallback(
    ({ item }: { item: AddressItem }) => {
      const isCurrentlyLinking = progress?.currentAddress === item.address;

      return (
        <Box
          twClassName="flex-row items-center justify-between px-4 py-3 rounded-lg border border-muted mb-2"
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="flex-1"
          >
            {isCurrentlyLinking ? (
              <ActivityIndicator size="small" />
            ) : (
              <Icon
                name={item.hasOptedIn ? IconName.Check : IconName.Close}
                color={item.hasOptedIn ? IconColor.Success : IconColor.Error}
              />
            )}

            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 ml-3 gap-2"
            >
              <Text variant={TextVariant.BodySm} twClassName="text-alternative">
                {renderSlightlyLongAddress(item.address)}
              </Text>

              <NetworkAvatars
                scopes={item.scopes}
                maxVisible={3}
                testID={`network-avatars-${item.address}`}
              />
            </Box>
          </Box>
        </Box>
      );
    },
    [progress?.currentAddress],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={handleDismiss}
    >
      {accountGroup && (
        <BottomSheetHeader onClose={handleDismiss}>
          {strings('rewards.account_group_optin_modal.title', {
            accountName: accountGroup?.name,
          })}
        </BottomSheetHeader>
      )}

      <Box twClassName="p-4 gap-2">
        {/* Progress information for auto-linking mode */}
        {autoLink && progress && isLinking && (
          <Text variant={TextVariant.BodyMd}>
            {strings('rewards.linking_progress', {
              completed: progress.completedCount + progress.failedCount,
              total: progress.totalCount,
            })}
          </Text>
        )}

        {addressData.length > 0 && (
          <FlatList
            data={addressData}
            keyExtractor={(item) => `${item.address}`}
            renderItem={renderAddressItem}
            showsVerticalScrollIndicator
            style={tw.style('max-h-80')}
          />
        )}

        {/* Cancel linking button */}
        {autoLink && isLinking && (
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('rewards.cancel_linking')}
            onPress={cancelLinking}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
          />
        )}
      </Box>
    </BottomSheet>
  );
};

export default RewardOptInAccountGroupModal;
