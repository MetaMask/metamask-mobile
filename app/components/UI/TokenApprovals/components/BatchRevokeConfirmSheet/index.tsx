import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
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
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { useBatchRevokeSupport } from '../../hooks/useBatchRevokeSupport';
import { useGasEstimation } from '../../hooks/useGasEstimation';
import { selectApprovals } from '../../selectors';
import Routes from '../../../../../constants/navigation/Routes';

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  // Single variant styles
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  tokenAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenInfo: {
    flex: 1,
  },
  exposureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  whatSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  whatTitle: {
    marginBottom: 8,
  },
  // Multi variant styles
  chainList: {
    marginBottom: 16,
  },
  chainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  chainSeparator: {
    height: StyleSheet.hairlineWidth,
  },
  chainAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chainLeft: {
    flex: 1,
  },
  chainRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  // Summary section
  summarySection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  upgradeBanner: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    gap: 10,
    alignItems: 'flex-start',
  },
  upgradeBannerText: {
    flex: 1,
  },
  // Gas estimate row
  gasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  // Shared
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  footerButton: {
    flex: 1,
  },
  note: {
    marginTop: 8,
    marginBottom: 8,
  },
});

function formatGasUsd(
  value: number,
  isLoading: boolean,
  inline = false,
): string {
  if (isLoading) return strings('token_approvals.confirm_gas_loading');
  if (value === 0) return strings('token_approvals.confirm_gas_unavailable');
  if (value < 0.01) return inline ? '~< $0.01 gas' : '< $0.01';
  return inline ? `~$${value.toFixed(2)} gas` : `~$${value.toFixed(2)}`;
}

const BatchRevokeConfirmSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const route = useRoute();
  const navigation = useNavigation();
  const { colors } = useTheme();

  const { approvalIds } = (route.params as { approvalIds: string[] }) ?? {
    approvalIds: [],
  };

  const allApprovals = useSelector(selectApprovals);
  const selectedApprovals = useMemo(() => {
    const idSet = new Set(approvalIds);
    return allApprovals.filter((a) => idSet.has(a.id));
  }, [allApprovals, approvalIds]);

  const {
    chainBreakdown,
    hasUpgradeRequired,
    isLoading: batchLoading,
  } = useBatchRevokeSupport(approvalIds);

  const {
    chainEstimates,
    totalGasUsd,
    totalTxCount,
    signingSteps,
    isLoading: gasLoading,
  } = useGasEstimation(selectedApprovals, chainBreakdown);

  const isInvalidBatchSelection = selectedApprovals.length < 2;

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      (
        navigation as StackNavigationProp<Record<string, undefined | object>>
      ).navigate(Routes.TOKEN_APPROVALS.REVOKE_PROCESSING, {
        approvalIds,
        chainBreakdown,
      });
    });
  }, [approvalIds, chainBreakdown, navigation]);

  const upgradeChainNames = chainBreakdown
    .filter((c) => c.supportsBatch && c.canUpgrade)
    .map((c) => c.chainName)
    .join(', ');

  useEffect(() => {
    if (isInvalidBatchSelection) {
      navigation.goBack();
    }
  }, [isInvalidBatchSelection, navigation]);

  if (isInvalidBatchSelection) {
    return null;
  }

  // --- Multi Approval Variant ---
  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSM}>
          {hasUpgradeRequired
            ? strings('token_approvals.confirm_multi_title_upgrade')
            : strings('token_approvals.confirm_multi_title')}
        </Text>
      </BottomSheetHeader>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Per-chain breakdown */}
        <View style={styles.chainList}>
          {chainBreakdown.map((chain, index) => {
            const gasEstimate = chainEstimates.find(
              (e) => e.chainId === chain.chainId,
            );
            const txCount = chain.supportsBatch ? 1 : chain.approvals.length;
            const isBatched = chain.supportsBatch;
            const approvalCount = chain.approvals.length;

            return (
              <React.Fragment key={chain.chainId}>
                {index > 0 && (
                  <View
                    style={[
                      styles.chainSeparator,
                      { backgroundColor: colors.border.muted },
                    ]}
                  />
                )}
                <View style={styles.chainRow}>
                  <View
                    style={[
                      styles.chainAvatar,
                      { backgroundColor: colors.background.alternative },
                    ]}
                  >
                    <Text
                      variant={TextVariant.BodyMDBold}
                      color={TextColor.Default}
                    >
                      {chain.chainName.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.chainLeft}>
                    <Text
                      variant={TextVariant.BodyMDBold}
                      color={TextColor.Default}
                    >
                      {chain.chainName}
                    </Text>
                    <Text
                      variant={TextVariant.BodySM}
                      color={TextColor.Alternative}
                    >
                      {approvalCount === 1
                        ? strings(
                            'token_approvals.confirm_multi_approvals_count_one',
                          )
                        : strings(
                            'token_approvals.confirm_multi_approvals_count',
                            {
                              count: approvalCount.toString(),
                            },
                          )}
                    </Text>
                  </View>
                  <View style={styles.chainRight}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: isBatched
                            ? colors.success.muted
                            : colors.background.alternative,
                        },
                      ]}
                    >
                      <Text
                        variant={TextVariant.BodySM}
                        color={
                          isBatched ? TextColor.Success : TextColor.Alternative
                        }
                      >
                        {isBatched
                          ? strings('token_approvals.batch_confirm_batched')
                          : strings(
                              'token_approvals.batch_confirm_sequential',
                              { count: txCount.toString() },
                            )}
                      </Text>
                    </View>
                    <Text
                      variant={TextVariant.BodySM}
                      color={TextColor.Alternative}
                    >
                      {formatGasUsd(gasEstimate?.gasUsd ?? 0, gasLoading, true)}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* Summary section */}
        <View
          style={[
            styles.summarySection,
            {
              backgroundColor: colors.background.muted,
              borderColor: colors.border.muted,
            },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('token_approvals.confirm_multi_total_transactions')}
            </Text>
            <Text variant={TextVariant.BodyMDBold} color={TextColor.Default}>
              {totalTxCount}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('token_approvals.confirm_multi_estimated_gas')}
            </Text>
            <Text variant={TextVariant.BodyMDBold} color={TextColor.Default}>
              {formatGasUsd(totalGasUsd, gasLoading)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('token_approvals.confirm_multi_signing_steps')}
            </Text>
            <Text variant={TextVariant.BodyMDBold} color={TextColor.Default}>
              {strings('token_approvals.confirm_multi_signing_confirmations', {
                count: signingSteps.toString(),
              })}
            </Text>
          </View>
        </View>

        {/* Note about individual transactions */}
        {chainBreakdown.some((c) => !c.supportsBatch) && (
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
            style={styles.note}
          >
            {strings('token_approvals.confirm_multi_note')}
          </Text>
        )}

        {/* Upgrade info banner */}
        {hasUpgradeRequired && (
          <View
            style={[
              styles.upgradeBanner,
              { backgroundColor: colors.info.muted },
            ]}
          >
            <Icon
              name={IconName.Info}
              size={IconSize.Md}
              color={IconColor.Info}
            />
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Default}
              style={styles.upgradeBannerText}
            >
              {strings('token_approvals.batch_confirm_upgrade_description', {
                chains: upgradeChainNames,
              })}
            </Text>
          </View>
        )}

        {/* Footer buttons */}
        <View style={styles.footer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            label={strings('token_approvals.cancel_button')}
            onPress={handleClose}
            style={styles.footerButton}
            width={ButtonWidthTypes.Full}
          />
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            label={strings('token_approvals.batch_confirm_cta')}
            onPress={handleConfirm}
            style={styles.footerButton}
            width={ButtonWidthTypes.Full}
            isDisabled={batchLoading}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default BatchRevokeConfirmSheet;
