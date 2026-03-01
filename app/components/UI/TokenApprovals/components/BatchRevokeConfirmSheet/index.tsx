import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
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
import { useBatchRevoke } from '../../hooks/useBatchRevoke';

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  chainCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  chainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chainName: {
    flex: 1,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  upgradeNote: {
    marginTop: 6,
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
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  footerButton: {
    flex: 1,
  },
});

const BatchRevokeConfirmSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const route = useRoute();
  const { colors } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { approvalIds } = (route.params as { approvalIds: string[] }) ?? {
    approvalIds: [],
  };

  const { chainBreakdown, hasUpgradeRequired, isLoading } =
    useBatchRevokeSupport(approvalIds);
  const { batchRevoke } = useBatchRevoke();

  const totalCount = approvalIds.length;

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      sheetRef.current?.onCloseBottomSheet(async () => {
        await batchRevoke(approvalIds, chainBreakdown);
      });
    } catch {
      setIsSubmitting(false);
    }
  }, [isSubmitting, approvalIds, chainBreakdown, batchRevoke]);

  const upgradeChainNames = chainBreakdown
    .filter((c) => c.supportsBatch && c.canUpgrade)
    .map((c) => c.chainName)
    .join(', ');

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('token_approvals.batch_confirm_title', {
            count: totalCount.toString(),
          })}
        </Text>
      </BottomSheetHeader>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Per-chain breakdown */}
        {chainBreakdown.map((chain) => {
          const txCount = chain.supportsBatch ? 1 : chain.approvals.length;
          const isBatched = chain.supportsBatch;

          return (
            <View
              key={chain.chainId}
              style={[
                styles.chainCard,
                { backgroundColor: colors.background.muted },
              ]}
            >
              <View style={styles.chainRow}>
                <Text
                  variant={TextVariant.BodyMDBold}
                  color={TextColor.Default}
                  style={styles.chainName}
                >
                  {chain.chainName} ({chain.approvals.length})
                </Text>
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
                      : strings('token_approvals.batch_confirm_sequential', {
                          count: txCount.toString(),
                        })}
                  </Text>
                </View>
              </View>
              {chain.supportsBatch && chain.canUpgrade && (
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                  style={styles.upgradeNote}
                >
                  {strings('token_approvals.batch_confirm_upgrade_title')}
                </Text>
              )}
            </View>
          );
        })}

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
            label={strings('token_approvals.filter_all')}
            onPress={handleClose}
            style={styles.footerButton}
            width={ButtonWidthTypes.Full}
            isDisabled={isSubmitting}
          />
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            label={strings('token_approvals.batch_confirm_cta')}
            isDanger
            onPress={handleConfirm}
            style={styles.footerButton}
            width={ButtonWidthTypes.Full}
            isDisabled={isSubmitting || isLoading}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default BatchRevokeConfirmSheet;
