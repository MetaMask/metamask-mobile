import React, {
  useCallback,
  useRef,
  useMemo,
  useEffect,
  useContext,
} from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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
import { renderSlightlyLongAddress } from '../../../../../util/address';
import NetworkAvatars from './NetworkAvatars';
import { useRewardOptinSummary } from '../../hooks/useRewardOptinSummary';
import { selectAccountGroupById } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';

interface RouteParams {
  accountGroupId: AccountGroupId;
  autoLink?: boolean;
}

interface AddressItem {
  address: string;
  hasOptedIn: boolean;
  scopes: string[];
}

const RewardOptInAccountGroupModal: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { accountGroupId, autoLink = false } = route.params as RouteParams;
  const tw = useTailwind();
  const accountGroupContext = useSelector((state: RootState) =>
    selectAccountGroupById(state, accountGroupId),
  );
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

  // Link account group state and functions
  const [isLinking, setIsLinking] = React.useState(false);
  const [progress] = React.useState(null);

  const linkAccountGroup = useCallback(async (_groupId: AccountGroupId) => {
    try {
      setIsLinking(true);

      // TODO: Implement actual account group linking logic
      // For now, simulate success after a delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return { success: true };
    } catch (error) {
      return { success: false, error };
    } finally {
      setIsLinking(false);
    }
  }, []);

  const cancelLinking = useCallback(() => {
    setIsLinking(false);
  }, []);

  const handleDismiss = useCallback(() => {
    // Cancel linking if in progress
    if (isLinking) {
      cancelLinking();
    }
    navigation.goBack();
  }, [navigation, isLinking, cancelLinking]);

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
                label: strings(
                  'rewards.link_account_group.link_account_success',
                  {
                    accountName: accountGroup.name,
                  },
                ),
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
                label: strings(
                  'rewards.link_account_group.link_account_error',
                  {
                    accountName: accountGroup.name,
                  },
                ),
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
      const isCurrentlyLinking = false; // TODO: Implement when progress is fully defined

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
    [], // TODO: Add progress dependency when progress is fully defined
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={handleDismiss}
    >
      {Boolean(accountGroupContext?.metadata?.name) && (
        <BottomSheetHeader onClose={handleDismiss}>
          {strings('rewards.link_account_group.link_account_with_name', {
            accountName: accountGroupContext?.metadata?.name,
          })}
        </BottomSheetHeader>
      )}

      <Box twClassName="p-4 gap-2">
        {/* Progress information for auto-linking mode */}
        {autoLink && isLinking && (
          <Text variant={TextVariant.BodyMd}>
            {strings('rewards.link_account_group.linking_progress', {
              completed: 0,
              total: 0,
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
            label={strings('rewards.link_account_group.cancel_linking')}
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
