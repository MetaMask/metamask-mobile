import React, { useMemo, useRef, useCallback } from 'react';
import { View, StyleSheet, Linking, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
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
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { useTheme } from '../../../../../util/theme';
import { renderShortAddress } from '../../../../../util/address';
import { strings } from '../../../../../../locales/i18n';
import { selectApprovals } from '../../selectors';
import { CHAIN_DISPLAY_NAMES } from '../../constants/chains';
import { Verdict } from '../../types';
import { formatUsd } from '../../utils/formatUsd';
import { useRevokeApproval } from '../../hooks/useRevokeApproval';

const BLOCK_EXPLORER_URLS: Record<string, string> = {
  '0x1': 'https://etherscan.io/address/',
  '0x89': 'https://polygonscan.com/address/',
  '0x38': 'https://bscscan.com/address/',
  '0xa86a': 'https://snowtrace.io/address/',
  '0xa4b1': 'https://arbiscan.io/address/',
  '0x2105': 'https://basescan.org/address/',
  '0xe708': 'https://lineascan.build/address/',
  '0xa': 'https://optimistic.etherscan.io/address/',
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
    gap: 8,
  },
  tokenName: {
    textAlign: 'center',
    marginTop: 4,
  },
  detailCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exposureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
  },
  featuresList: {
    gap: 8,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  warningIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  explorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 20,
    gap: 6,
  },
  revokeButton: {
    marginTop: 12,
    borderRadius: 999,
  },
});

const ApprovalDetailSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const route = useRoute();
  const { colors } = useTheme();
  const approvals = useSelector(selectApprovals);
  const { revokeApproval } = useRevokeApproval();

  const { approvalId } = (route.params as { approvalId: string }) ?? {};

  const approval = useMemo(
    () => approvals.find((a) => a.id === approvalId),
    [approvals, approvalId],
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleRevoke = useCallback(() => {
    if (!approval) return;
    // Close the detail sheet, then submit the revoke transaction
    // addTransaction() inside revokeApproval triggers the standard confirmation UI
    sheetRef.current?.onCloseBottomSheet(() => {
      revokeApproval(approval);
    });
  }, [approval, revokeApproval]);

  if (!approval) {
    return null;
  }

  const chainName = CHAIN_DISPLAY_NAMES[approval.chainId] ?? approval.chainId;
  const explorerUrl = BLOCK_EXPLORER_URLS[approval.chainId];
  const isMalicious = approval.verdict === Verdict.Malicious;
  const isWarning = approval.verdict === Verdict.Warning;
  const exposureUsd = Number(approval.exposure_usd) || 0;

  const handleViewExplorer = () => {
    if (explorerUrl) {
      Linking.openURL(`${explorerUrl}${approval.spender.address}`);
    }
  };

  const getFeatureIconBg = () => {
    if (isMalicious) return colors.error.muted;
    if (isWarning) return colors.warning.muted;
    return colors.background.alternative;
  };

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('token_approvals.detail_title')}
        </Text>
      </BottomSheetHeader>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <AvatarToken
            size={AvatarSize.Xl}
            name={approval.asset.symbol}
            imageSource={
              approval.asset.logo_url
                ? { uri: approval.asset.logo_url }
                : undefined
            }
          />
          <Text
            variant={TextVariant.HeadingSM}
            color={TextColor.Default}
            style={styles.tokenName}
          >
            {approval.asset.name} ({approval.asset.symbol})
          </Text>
        </View>

        {/* Detail Card */}
        <View
          style={[
            styles.detailCard,
            { backgroundColor: colors.background.muted },
          ]}
        >
          {/* Network */}
          <View
            style={[
              styles.detailRow,
              styles.detailRowBorder,
              { borderBottomColor: colors.border.muted },
            ]}
          >
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('token_approvals.detail_chain')}
            </Text>
            <Text variant={TextVariant.BodyMDBold} color={TextColor.Default}>
              {chainName}
            </Text>
          </View>

          {/* Spender */}
          <View
            style={[
              styles.detailRow,
              styles.detailRowBorder,
              { borderBottomColor: colors.border.muted },
            ]}
          >
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('token_approvals.detail_spender')}
            </Text>
            <Text variant={TextVariant.BodyMDBold} color={TextColor.Default}>
              {approval.spender.label ||
                renderShortAddress(approval.spender.address)}
            </Text>
          </View>

          {/* Allowance */}
          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('token_approvals.detail_allowance')}
            </Text>
            <Text
              variant={TextVariant.BodyMDBold}
              color={
                approval.allowance.is_unlimited
                  ? TextColor.Warning
                  : TextColor.Default
              }
            >
              {approval.allowance.is_unlimited
                ? strings('token_approvals.unlimited')
                : approval.allowance.amount}
            </Text>
          </View>
        </View>

        {/* Exposure / Value at Risk - Highlighted separately */}
        {exposureUsd > 0 && (
          <View
            style={[
              styles.exposureRow,
              { backgroundColor: colors.error.muted },
            ]}
          >
            <Text variant={TextVariant.BodyMDBold} color={TextColor.Error}>
              {strings('token_approvals.detail_exposure')}
            </Text>
            <Text variant={TextVariant.HeadingSM} color={TextColor.Error}>
              {formatUsd(exposureUsd)}
            </Text>
          </View>
        )}

        {/* Spender Features / Analysis */}
        {approval.spender.features.length > 0 && (
          <>
            <Text
              variant={TextVariant.BodyMDBold}
              color={TextColor.Alternative}
              style={styles.sectionHeader}
            >
              {strings('token_approvals.detail_spender_features')}
            </Text>
            <View style={styles.featuresList}>
              {approval.spender.features.map((feature) => (
                <View
                  key={feature.id}
                  style={[
                    styles.featurePill,
                    { backgroundColor: colors.background.muted },
                  ]}
                >
                  <View
                    style={[
                      styles.warningIcon,
                      { backgroundColor: getFeatureIconBg() },
                    ]}
                  >
                    <Icon
                      name={
                        isMalicious || isWarning
                          ? IconName.Warning
                          : IconName.Info
                      }
                      size={IconSize.Xs}
                      color={
                        isMalicious
                          ? IconColor.Error
                          : isWarning
                            ? IconColor.Warning
                            : IconColor.Muted
                      }
                    />
                  </View>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Default}
                    style={styles.featureText}
                  >
                    {feature.description}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Block Explorer */}
        {explorerUrl && (
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            label={strings('token_approvals.detail_view_explorer')}
            onPress={handleViewExplorer}
            style={styles.explorerButton}
            width={ButtonWidthTypes.Full}
            startIconName={IconName.Export}
          />
        )}

        {/* Revoke */}
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          label={strings('token_approvals.revoke')}
          isDanger
          onPress={handleRevoke}
          style={styles.revokeButton}
          width={ButtonWidthTypes.Full}
        />
      </ScrollView>
    </BottomSheet>
  );
};

export default ApprovalDetailSheet;
