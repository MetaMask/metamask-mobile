import React, { useCallback } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import Routes from '../../../../../constants/navigation/Routes';
import { createAccountSelectorNavDetails } from '../../../../Views/AccountSelector';
import { ApprovalItem, Verdict } from '../../types';
import { useTokenApprovals } from '../../hooks/useTokenApprovals';
import { useApprovalFilters } from '../../hooks/useApprovalFilters';
import { useRevokeApproval } from '../../hooks/useRevokeApproval';
import RiskDashboardHeader from '../../components/RiskDashboardHeader';
import RiskGroupedList from '../../components/RiskGroupedList';
import ChainFilterBar from '../../components/ChainFilterBar';
import BatchRevokeBar from '../../components/BatchRevokeBar';
import EmptyState from '../../components/EmptyState';
import SkeletonApprovalCard from '../../components/SkeletonApprovalCard';

const LEARN_MORE_URL =
  'https://support.metamask.io/privacy-and-security/how-to-revoke-smart-contract-allowances-token-approvals/';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  accountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  learnMoreRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    paddingTop: 8,
    gap: 2,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  chainErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
});

const SKELETON_COUNT = 5;

const TokenApprovalsView: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const {
    approvals,
    filteredApprovals,
    isLoading,
    error,
    chainErrors,
    availableChains,
  } = useTokenApprovals();

  const failedChainCount = Object.keys(chainErrors).length;

  const {
    selectedChains,
    searchQuery,
    selectedApprovalIds,
    revocations,
    selectionMode,
    onChainToggle,
    onSearchChange,
    onToggleSelection,
    onSelectAll,
    onClearSelection,
    onExitSelectionMode,
  } = useApprovalFilters();

  const { revokeApproval } = useRevokeApproval();

  const handleBack = useCallback(() => {
    if (selectionMode) {
      onExitSelectionMode();
    }
    navigation.goBack();
  }, [navigation, selectionMode, onExitSelectionMode]);

  const handleApprovalPress = useCallback(
    (approval: ApprovalItem) => {
      navigation.navigate(Routes.TOKEN_APPROVALS.MODALS.ROOT, {
        screen: Routes.TOKEN_APPROVALS.MODALS.APPROVAL_DETAIL,
        params: { approvalId: approval.id },
      });
    },
    [navigation],
  );

  const handleRevoke = useCallback(
    (approval: ApprovalItem) => {
      revokeApproval(approval);
    },
    [revokeApproval],
  );

  const handleRevokeSelection = useCallback(
    (approvalIds: string[]) => {
      if (approvalIds.length === 1) {
        const approval = approvals.find((item) => item.id === approvalIds[0]);
        if (!approval) {
          return;
        }

        onClearSelection();
        revokeApproval(approval);
        return;
      }

      if (approvalIds.length < 2) {
        return;
      }

      navigation.navigate(
        Routes.TOKEN_APPROVALS.MODALS.ROOT as never,
        {
          screen: Routes.TOKEN_APPROVALS.MODALS.BATCH_REVOKE_CONFIRM,
          params: { approvalIds },
        } as never,
      );
    },
    [approvals, navigation, onClearSelection, revokeApproval],
  );

  const handleBatchRevoke = useCallback(() => {
    handleRevokeSelection(selectedApprovalIds);
  }, [handleRevokeSelection, selectedApprovalIds]);

  const handleRevokeAllRisky = useCallback(() => {
    const riskyIds = approvals
      .filter(
        (a) => a.verdict === Verdict.Malicious || a.verdict === Verdict.Warning,
      )
      .map((a) => a.id);
    handleRevokeSelection(riskyIds);
  }, [approvals, handleRevokeSelection]);

  const handleLearnMore = useCallback(() => {
    Linking.openURL(LEARN_MORE_URL);
  }, []);

  const handleClearSearch = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  const renderSkeletonList = () => (
    <View style={styles.loadingContainer}>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <SkeletonApprovalCard key={`skeleton-${i}`} />
      ))}
    </View>
  );

  const renderListHeader = () => (
    <View>
      {/* Risk Dashboard */}
      <RiskDashboardHeader
        approvals={approvals}
        onRevokeAllRisky={handleRevokeAllRisky}
        isProcessing={false}
      />

      {/* Partial data warning */}
      {failedChainCount > 0 && (
        <View
          style={[
            styles.chainErrorBanner,
            { backgroundColor: colors.warning.muted },
          ]}
        >
          <Icon
            name={IconName.Warning}
            size={IconSize.Sm}
            color={IconColor.Warning}
          />
          <Text variant={TextVariant.BodySM} color={TextColor.Warning}>
            {failedChainCount === 1
              ? 'Could not load approvals for 1 network. Data may be incomplete.'
              : `Could not load approvals for ${failedChainCount} networks. Data may be incomplete.`}
          </Text>
        </View>
      )}

      {/* Chain Filters */}
      <ChainFilterBar
        chains={availableChains}
        selectedChains={selectedChains}
        onChainToggle={onChainToggle}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon
              name={IconName.ArrowLeft}
              size={IconSize.Md}
              color={IconColor.Default}
            />
          </TouchableOpacity>
          <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
            {strings('token_approvals.title')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.accountSelector}
          onPress={() =>
            navigation.navigate(...createAccountSelectorNavDetails({}))
          }
          accessibilityRole="button"
          accessibilityLabel="Switch account"
        >
          <AvatarAccount
            size={AvatarSize.Xs}
            accountAddress={selectedAccount?.address ?? ''}
          />
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {selectedAccount?.metadata?.name ?? 'Account'}
          </Text>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Xs}
            color={IconColor.Default}
          />
        </TouchableOpacity>
      </View>

      {/* Learn more link */}
      <View style={styles.learnMoreRow}>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {strings('token_approvals.subtitle')}{' '}
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Info}
            onPress={handleLearnMore}
            suppressHighlighting
          >
            {strings('token_approvals.education_learn_more')}
          </Text>
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.background.section },
          ]}
        >
          <Icon
            name={IconName.Search}
            size={IconSize.Md}
            color={IconColor.Muted}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text.default }]}
            placeholder={strings('token_approvals.search_placeholder')}
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={strings('token_approvals.search_placeholder')}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon
                name={IconName.Close}
                size={IconSize.Sm}
                color={IconColor.Muted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading && filteredApprovals.length === 0 ? (
        renderSkeletonList()
      ) : error && filteredApprovals.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
            {error}
          </Text>
        </View>
      ) : filteredApprovals.length === 0 ? (
        <EmptyState />
      ) : (
        <RiskGroupedList
          approvals={filteredApprovals}
          selectedIds={selectedApprovalIds}
          revocations={revocations}
          selectionMode={selectionMode}
          onApprovalPress={handleApprovalPress}
          onApprovalSelect={onToggleSelection}
          onApprovalRevoke={handleRevoke}
          onSelectAll={onSelectAll}
          ListHeaderComponent={renderListHeader()}
        />
      )}

      {/* Batch Revoke Bar */}
      <BatchRevokeBar
        selectedCount={selectedApprovalIds.length}
        onRevoke={handleBatchRevoke}
        onClear={onClearSelection}
        isProcessing={false}
      />
    </SafeAreaView>
  );
};

export default TokenApprovalsView;
