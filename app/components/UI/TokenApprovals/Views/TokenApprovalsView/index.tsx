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
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
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
  learnMoreRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
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
  } = useApprovalFilters();

  const { revokeApproval } = useRevokeApproval();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
      // Skip intermediate confirmation, go straight to standard MetaMask confirmation UI
      revokeApproval(approval);
    },
    [revokeApproval],
  );

  const handleBatchRevoke = useCallback(() => {
    navigation.navigate(
      Routes.TOKEN_APPROVALS.MODALS.ROOT as never,
      {
        screen: Routes.TOKEN_APPROVALS.MODALS.BATCH_REVOKE_CONFIRM,
        params: { approvalIds: selectedApprovalIds },
      } as never,
    );
  }, [navigation, selectedApprovalIds]);

  const handleRevokeAllRisky = useCallback(() => {
    const riskyIds = approvals
      .filter(
        (a) => a.verdict === Verdict.Malicious || a.verdict === Verdict.Warning,
      )
      .map((a) => a.id);
    if (riskyIds.length > 0) {
      navigation.navigate(
        Routes.TOKEN_APPROVALS.MODALS.ROOT as never,
        {
          screen: Routes.TOKEN_APPROVALS.MODALS.BATCH_REVOKE_CONFIRM,
          params: { approvalIds: riskyIds },
        } as never,
      );
    }
  }, [approvals, navigation]);

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
            { backgroundColor: colors.background.alternative },
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
