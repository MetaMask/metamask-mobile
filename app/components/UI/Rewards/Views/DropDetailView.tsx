import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, ScrollView, TouchableOpacity, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../component-library/components/Skeleton';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import DropTile from '../components/DropTile/DropTile';
import DropPrerequisiteList from '../components/DropPrerequisite/DropPrerequisiteList';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useSeasonDrops } from '../hooks/useSeasonDrops';
import { useDropEligibility } from '../hooks/useDropEligibility';
import {
  SeasonDropDto,
  DropStatus,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';
import { useDropLeaderboard } from '../hooks/useDropLeaderboard';
import DropCTAButtons from '../components/DropCTAButtons/DropCTAButtons';
import DropLeaderboard from '../components/DropLeaderboard';
import { useSelector, useDispatch } from 'react-redux';
import useTooltipModal from '../../../hooks/useTooltipModal';
import { useUpdateDropReceivingAddress } from '../hooks/useUpdateDropReceivingAddress';
import useRewardsToast from '../hooks/useRewardsToast';
import {
  selectInternalAccountsByGroupId,
  selectIconSeedAddressByAccountGroupId,
} from '../../../../selectors/multichainAccounts/accounts';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import {
  mapReceivingBlockchainIdToEnum,
  findMatchingBlockchainAccount,
} from '../utils/blockchainUtils';
import Engine from '../../../../core/Engine';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import MultichainAccountSelectorList from '../../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import AvatarAccount from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import { RootState } from '../../../../reducers';
import Logger from '../../../../util/Logger';
import { setIsValidatingDropAddress } from '../../../../reducers/rewards';

type AccountPickerMode = 'commit' | 'change';

/**
 * DropDetailView displays detailed information about a specific drop.
 * Shows the drop tile, prerequisites, commitment section, and leaderboard.
 *
 * Account selection is handled inline via a single shared BottomSheet
 * used by both the initial commit flow and the change-account flow.
 */
const DropDetailView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute<RouteProp<{ params: { dropId: string } }, 'params'>>();
  const { dropId } = route?.params ?? { dropId: '' };
  const { openTooltipModal } = useTooltipModal();
  const { showToast, RewardsToastOptions } = useRewardsToast();

  // Shared account picker state
  const accountPickerRef = useRef<BottomSheetRef>(null);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [accountPickerMode, setAccountPickerMode] = useState<AccountPickerMode>('commit');

  // Local account group state for commit flow (avoids changing global active account)
  const [localAccountGroup, setLocalAccountGroup] = useState<AccountGroupObject | null>(null);
  const [localAddress, setLocalAddress] = useState<string | null>(null);
  const dispatch = useDispatch();

  // Get drops using the hook
  const { drops, isLoading, hasError, fetchDrops } = useSeasonDrops();
  const drop = useMemo(
    (): SeasonDropDto | undefined => drops?.find((s) => s.id === dropId),
    [drops, dropId],
  );

  // Fetch eligibility data for prerequisite statuses
  const {
    eligibility,
    isLoading: isLoadingEligibility,
    error: eligibilityError,
    refetch: refetchEligibility,
  } = useDropEligibility(dropId);

  const {
    leaderboard,
    isLoading: isLoadingLeaderboard,
    error: leaderboardError,
  } = useDropLeaderboard(dropId);

  // Global account group and selectors
  const getAccountsByGroupId = useSelector(selectInternalAccountsByGroupId);
  const avatarAccountType = useSelector(selectAvatarAccountType);

  const { updateDropReceivingAddress } =
    useUpdateDropReceivingAddress();

  // EVM address for avatar rendering
  const evmAddress = useSelector((state: RootState) => {
    if (!localAccountGroup?.id) return undefined;
    try {
      const selector = selectIconSeedAddressByAccountGroupId(
        localAccountGroup.id,
      );
      return selector(state);
    } catch {
      return undefined;
    }
  });

  const doChangeAccountUpdate = useCallback(
    async (address: string) => {
      Logger.log('doChangeAccountUpdate', { address });
      const success = await updateDropReceivingAddress(dropId, address);
      if (success) {
        showToast(
          RewardsToastOptions.success(
            strings('rewards.drops.update_account_success_title'),
            strings('rewards.drops.update_account_success_description'),
          ),
        );
      } else {
        showToast(
          RewardsToastOptions.error(
            strings('rewards.drops.update_account_error_title'),
            strings('rewards.drops.update_account_error_description'),
          ),
        );
      }
    },
    [dropId, updateDropReceivingAddress, showToast, RewardsToastOptions],
  );

  /**
   * Validates an account group for this drop:
   * 1. Finds a matching blockchain account
   * 2. Checks opt-in support
   * 3. Verifies subscription ID matches the active rewards profile
   *
   * Returns the validated address, or null if validation fails.
   */
  const validateAccountGroupForDrop = useCallback(
    async (accountGroup: AccountGroupObject): Promise<string | null> => {
      const blockchain = drop?.receivingBlockchain;
      if (blockchain === undefined) return null;

      const required = mapReceivingBlockchainIdToEnum(blockchain);
      if (!required) return null;

      const accounts = getAccountsByGroupId(accountGroup.id);
      const matching = findMatchingBlockchainAccount(accounts, required);
      if (!matching) {
        showToast(
            RewardsToastOptions.error(
              strings('rewards.drops.cant_select_account_title'),
              strings('rewards.drops.cant_select_account_description'),
            ),
          );
        return null;
      }

      // Subscription ID validation:
      // - accountSubId matches active → allowed
      // - accountSubId is null → attempt to link via controller, then re-verify
      // - accountSubId differs from active → blocked, show error toast
      const candidateSubscriptionId = await Engine.controllerMessenger.call(
        'RewardsController:getCandidateSubscriptionId',
      );

      if (candidateSubscriptionId) {
        const optInStatus = await Engine.controllerMessenger.call(
          'RewardsController:getOptInStatus',
          { addresses: [matching.address] },
        );
        let accountSubId = optInStatus.sids[0];

        if (!accountSubId) {
          // Account not yet linked — attempt to link it now
          const linkSuccess = await Engine.controllerMessenger.call(
            'RewardsController:linkAccountToSubscriptionCandidate',
            matching,
            true,
          );

          if (!linkSuccess) {
            showToast(
              RewardsToastOptions.error(
                strings('rewards.drops.cant_select_account_title'),
                strings('rewards.drops.cant_select_account_description'),
              ),
            );
            return null;
          }

          // Re-fetch to confirm the linked subscription matches the active one
          const refreshedStatus = await Engine.controllerMessenger.call(
            'RewardsController:getOptInStatus',
            { addresses: [matching.address] },
          );
          accountSubId = refreshedStatus.sids[0];
        }

        if (accountSubId && accountSubId !== candidateSubscriptionId) {
          showToast(
            RewardsToastOptions.error(
              strings('rewards.drops.cant_select_account_title'),
              strings('rewards.drops.cant_select_account_description'),
            ),
          );
          return null;
        }
      }

      return matching.address;
    },
    [drop?.receivingBlockchain, getAccountsByGroupId, showToast, RewardsToastOptions],
  );

  // Open the shared account picker in a given mode
  const openAccountPicker = useCallback((mode: AccountPickerMode) => {
    setAccountPickerMode(mode);
    setShowAccountPicker(true);
  }, []);

  const handleCloseAccountPicker = useCallback(() => {
    setShowAccountPicker(false);
  }, []);

  // Shared account group selection handler for both commit and change flows.
  //
  // The callback passed to onCloseBottomSheet runs inside onCloseCB, which is
  // invoked synchronously *after* the onClose prop (handleCloseAccountPicker →
  // setShowAccountPicker(false)). React 18 batches both state changes into a
  // single Fabric commit, meaning the BottomSheet unmount and the
  // DropLeaderboard Skeleton↔AvatarAccount swap happen in the same native
  // commit — corrupting Fabric's view-tag registry and crashing on the next
  // sheet open with "Unable to find viewState for tag X".
  //
  // Fix: defer validation work to InteractionManager.runAfterInteractions so
  // it runs in a *separate* Fabric commit after the BottomSheet unmount is
  // fully processed.
  const handleSelectAccountGroup = useCallback(
    (accountGroup: AccountGroupObject) => {
      accountPickerRef.current?.onCloseBottomSheet(() => {
        InteractionManager.runAfterInteractions(async () => {
            Logger.log('handleSelectAccountGroup', { accountGroup });
            dispatch(setIsValidatingDropAddress(true));
            try {
              const address = await validateAccountGroupForDrop(accountGroup);
              Logger.log('handleSelectAccountGroup validated address', { address });
              if (!address) return;

              if (accountPickerMode === 'commit') {
                setLocalAccountGroup(accountGroup);
                setLocalAddress(address);
              } else {
                doChangeAccountUpdate(address);
              }
            } finally {
              dispatch(setIsValidatingDropAddress(false));
            }
        });
      });
    },
    [accountPickerMode, validateAccountGroupForDrop, doChangeAccountUpdate, dispatch],
  );

  const handleChangeAccount = useCallback(() => {
    openAccountPicker('change');
  }, [openAccountPicker]);

  const handleEnterPress = useCallback(() => {
    if (localAddress) {
      navigation.navigate(Routes.REWARDS_DROP_COMMITMENT, {
        dropId: drop?.id,
        dropName: drop?.name,
        hasExistingCommitment: false,
        selectedBlockchainAddress: localAddress,
      });
    }
  }, [navigation, drop?.id, drop?.name, localAddress]);

  const hasCommitted = useMemo(
    () => Boolean(leaderboard?.userPosition?.points),
    [leaderboard],
  );

  const eligibilityUnavailable =
    isLoadingEligibility || (eligibilityError && !eligibility);

  const sectionVisibility = useMemo(
    () => ({
      showQualifyNow: Boolean(
        !eligibilityUnavailable &&
          !isLoadingLeaderboard &&
          drop?.prerequisites &&
          !eligibility?.eligible &&
          eligibility?.canCommit &&
          !hasCommitted,
      ),
      showCommitment: Boolean(
        !eligibilityUnavailable &&
          !isLoadingLeaderboard &&
          eligibility?.eligible &&
          eligibility?.canCommit &&
          !hasCommitted,
      ),
      showLeaderboard: Boolean(
        !eligibilityUnavailable &&
          (isLoadingLeaderboard ||
            hasCommitted ||
            (drop?.status !== DropStatus.UPCOMING &&
              drop?.status !== DropStatus.OPEN)),
      ),
    }),
    [
      eligibilityUnavailable,
      isLoadingLeaderboard,
      drop?.prerequisites,
      drop?.status,
      eligibility?.eligible,
      eligibility?.canCommit,
      hasCommitted,
    ],
  );

  useEffect(() => {
    if (drop) {
      refetchEligibility();
    }
  }, [drop, refetchEligibility]);

  const handleInfoPress = useCallback(() => {
    openTooltipModal(
      strings('rewards.drop_detail.info_title'),
      strings('rewards.drop_detail.info_description'),
    );
  }, [openTooltipModal]);

  const headerRightStyle = useMemo(() => tw.style('mr-4'), [tw]);

  const HeaderRight = useCallback(
    () => (
      <View style={headerRightStyle}>
        <ButtonIcon
          iconName={IconName.Question}
          size={ButtonIconSize.Lg}
          iconProps={{ color: IconColor.IconDefault }}
          onPress={handleInfoPress}
          testID="drop-detail-info-button"
        />
      </View>
    ),
    [headerRightStyle, handleInfoPress],
  );

  // Set navigation title with back button and info icon
  useEffect(() => {
    navigation.setOptions({
      ...getNavigationOptionsTitle(
        strings('rewards.drop_detail.title'),
        navigation,
        false,
        colors,
      ),
      headerTitleAlign: 'center',
      headerRight: HeaderRight,
    });
  }, [colors, navigation, HeaderRight]);

  const renderSkeletonLoading = () => (
    <Skeleton height={160} style={tw.style('rounded-lg')} />
  );

  const renderContent = () => {
    if (isLoading) {
      return renderSkeletonLoading();
    }

    if (hasError) {
      return (
        <RewardsErrorBanner
          title={strings('rewards.drop_detail.error_title')}
          description={strings('rewards.drop_detail.error_description')}
          onConfirm={fetchDrops}
          confirmButtonLabel={strings('rewards.drop_detail.retry')}
          testID="drop-detail-error-banner"
        />
      );
    }

    if (!drop) {
      return (
        <Box twClassName="items-center justify-center py-12">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.drop_detail.not_found')}
          </Text>
        </Box>
      );
    }

    return (
      <Box twClassName="gap-6">
        <DropTile drop={drop} disabled />

        {eligibilityUnavailable && isLoadingEligibility && (
          <Box twClassName="gap-6">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.drop_detail.qualify_now')}
            </Text>
            <DropPrerequisiteList
              prerequisites={
                drop?.prerequisites ?? { logic: 'AND', conditions: [] }
              }
              isLoading
            />
          </Box>
        )}

        {eligibilityError &&
          !eligibilityUnavailable &&
          !isLoadingEligibility && (
            <RewardsErrorBanner
              title={strings('rewards.drop_detail.eligibility_error_title')}
              description={strings(
                'rewards.drop_detail.eligibility_error_description',
              )}
              onConfirm={refetchEligibility}
              confirmButtonLabel={strings('rewards.drop_detail.retry')}
              testID="drop-eligibility-error-banner"
            />
          )}

        {/*  Qualify now section */}
        {sectionVisibility.showQualifyNow && drop?.prerequisites && (
          <Box twClassName="gap-6">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.drop_detail.qualify_now')}
            </Text>
            <DropPrerequisiteList
              prerequisites={drop.prerequisites}
              prerequisiteStatuses={eligibility?.prerequisiteStatuses}
            />
            <DropCTAButtons prerequisites={drop.prerequisites} />
          </Box>
        )}

        {/*  Initial drop commitment section (info only - account selector pinned to bottom) */}
        {sectionVisibility.showCommitment && (
          <Box twClassName="gap-4">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.drops.enter_the_drop')}
            </Text>
            <Box twClassName="gap-2">
              <Box flexDirection={BoxFlexDirection.Row} gap={3}>
                <Icon name={IconName.MountainFlag} size={IconSize.Lg} />
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  twClassName="text-text-default flex-1"
                >
                  {strings('rewards.drops.spend_points_title')}
                </Text>
              </Box>
              <Box flexDirection={BoxFlexDirection.Row}>
                <Box twClassName="w-9" />
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  twClassName="text-alternative text-left flex-1"
                >
                  {strings('rewards.drops.spend_points_description')}
                </Text>
              </Box>
            </Box>
          </Box>
        )}

        {/*  Leaderboard section */}
        {sectionVisibility.showLeaderboard && (
          <Box twClassName="gap-6">
            <Text variant={TextVariant.HeadingMd} twClassName="text-default">
              {strings('rewards.drop_detail.leaderboard')}
            </Text>
            <DropLeaderboard
              leaderboard={leaderboard}
              isLoading={isLoadingLeaderboard}
              error={leaderboardError}
              canCommit={eligibility?.canCommit ?? false}
              dropStatus={drop?.status as DropStatus}
              dropId={drop?.id}
              onAddMorePoints={() =>
                navigation.navigate(Routes.REWARDS_DROP_COMMITMENT, {
                  dropId: drop?.id,
                  dropName: drop?.name,
                  hasExistingCommitment: true,
                })
              }
              onChangeAccount={handleChangeAccount}
            />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <ErrorBoundary navigation={navigation} view="DropDetailView">
      <View style={tw.style('flex-1')}>
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('px-4 py-4')}
          showsVerticalScrollIndicator={false}
          testID="drop-detail-view"
        >
          {renderContent()}
        </ScrollView>

        {/* Pinned to bottom - commit flow account selector & enter button */}
        {sectionVisibility.showCommitment && drop && (
          <View style={tw.style('px-4 pb-4 mb-4')}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              style={tw.style('text-text-default mb-4')}
              testID="drop-account-section-description"
            >
              {strings('rewards.drops.select_account_description')}
            </Text>

            {/* Account Selector Row */}
            {localAccountGroup ? (
              <TouchableOpacity
                onPress={() => openAccountPicker('commit')}
                style={tw.style(
                  'flex-row items-center rounded-lg bg-background-muted p-4 mb-4',
                )}
                testID="drop-account-selector"
              >
                <AvatarAccount
                  accountAddress={
                    evmAddress || '0x0000000000000000000000000000000000000000'
                  }
                  type={avatarAccountType}
                  size={AvatarSize.Md}
                />
                <Box
                  flexDirection={BoxFlexDirection.Column}
                  twClassName="flex-1 ml-4"
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    numberOfLines={1}
                    testID="drop-account-name"
                  >
                    {localAccountGroup.metadata.name}
                  </Text>
                </Box>
                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Lg}
                  color={IconColor.IconAlternative}
                  testID="drop-account-arrow"
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => openAccountPicker('commit')}
                style={tw.style(
                  'flex-row items-center rounded-lg bg-background-muted p-4 mb-4',
                )}
                testID="drop-account-selector"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  twClassName="text-alternative flex-1"
                  testID="drop-account-name"
                >
                  {strings('rewards.drops.select_account')}
                </Text>
                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Lg}
                  color={IconColor.IconAlternative}
                  testID="drop-account-arrow"
                />
              </TouchableOpacity>
            )}

            {/* Enter Button */}
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={handleEnterPress}
              isDisabled={!localAddress}
              testID="drop-enter-button"
              twClassName="w-full"
            >
              {strings('rewards.drops.enter')}
            </Button>
          </View>
        )}
      </View>

      {/* Single shared BottomSheet for both commit and change account flows */}
      {showAccountPicker && (
        <BottomSheet
          ref={accountPickerRef}
          onClose={handleCloseAccountPicker}
          shouldNavigateBack={false}
        >
          <BottomSheetHeader onBack={handleCloseAccountPicker}>
            {strings('accounts.accounts_title')}
          </BottomSheetHeader>
          <MultichainAccountSelectorList
            onSelectAccount={handleSelectAccountGroup}
            selectedAccountGroups={[]}
            showFooter={false}
            hideAccountCellMenu
            testID="drop-account-picker-list"
          />
        </BottomSheet>
      )}
    </ErrorBoundary>
  );
};

export default DropDetailView;
