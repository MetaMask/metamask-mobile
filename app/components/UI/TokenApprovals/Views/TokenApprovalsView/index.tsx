import React, { useCallback, useState } from 'react';
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
import { ApprovalItem } from '../../types';
import { useTokenApprovals } from '../../hooks/useTokenApprovals';
import { useApprovalFilters } from '../../hooks/useApprovalFilters';
import { useBatchRevoke } from '../../hooks/useBatchRevoke';
import ApprovalsList from '../../components/ApprovalsList';
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
  subtitleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
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
});

const SKELETON_COUNT = 5;

const TokenApprovalsView: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const { filteredApprovals, isLoading, error, availableChains } =
    useTokenApprovals();

  const {
    selectedChains,
    searchQuery,
    selectedApprovalIds,
    revocations,
    selectionMode,
    onChainToggle,
    onSearchChange,
    onToggleSelection,
    onClearSelection,
  } = useApprovalFilters();

  const { batchRevoke } = useBatchRevoke();

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
      navigation.navigate(Routes.TOKEN_APPROVALS.MODALS.ROOT, {
        screen: Routes.TOKEN_APPROVALS.MODALS.REVOKE_CONFIRM,
        params: { approvalId: approval.id },
      });
    },
    [navigation],
  );

  const handleBatchRevoke = useCallback(async () => {
    setIsBatchProcessing(true);
    try {
      await batchRevoke(selectedApprovalIds);
    } finally {
      setIsBatchProcessing(false);
    }
  }, [batchRevoke, selectedApprovalIds]);

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
      {/* Risk Banner */}
      {/* <ApprovalRiskBanner
        maliciousCount={maliciousCount}
        exposureUsd={maliciousExposureUsd}
        onRevokeAll={revokeAllMalicious}
      /> */}

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

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
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
        <ApprovalsList
          approvals={filteredApprovals}
          selectedIds={selectedApprovalIds}
          revocations={revocations}
          selectionMode={selectionMode}
          onApprovalPress={handleApprovalPress}
          onApprovalSelect={onToggleSelection}
          onApprovalRevoke={handleRevoke}
          ListHeaderComponent={renderListHeader()}
        />
      )}

      {/* Batch Revoke Bar */}
      <BatchRevokeBar
        selectedCount={selectedApprovalIds.length}
        onRevoke={handleBatchRevoke}
        onClear={onClearSelection}
        isProcessing={isBatchProcessing}
      />
    </SafeAreaView>
  );
};

export default TokenApprovalsView;
