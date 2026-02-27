import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
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
import { useTheme } from '../../../../../util/theme';
import { renderShortAddress } from '../../../../../util/address';
import { strings } from '../../../../../../locales/i18n';
import { selectApprovals } from '../../selectors';
import { CHAIN_DISPLAY_NAMES } from '../../constants/chains';
import RiskBadge from '../RiskBadge';
import Routes from '../../../../../constants/navigation/Routes';

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
  container: {
    flex: 1,
    paddingBottom: 32,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 8,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  heroName: {
    textAlign: 'center',
  },
  detailCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featuresSection: {
    marginTop: 16,
  },
  featuresLabel: {
    marginBottom: 8,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  explorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
    gap: 6,
  },
  revokeButton: {
    marginTop: 24,
    borderRadius: 12,
  },
});

const ApprovalDetailSheet: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const approvals = useSelector(selectApprovals);

  const { approvalId } = (route.params as { approvalId: string }) ?? {};

  const approval = useMemo(
    () => approvals.find((a) => a.id === approvalId),
    [approvals, approvalId],
  );

  if (!approval) {
    return null;
  }

  const chainName = CHAIN_DISPLAY_NAMES[approval.chainId] ?? approval.chainId;
  const explorerUrl = BLOCK_EXPLORER_URLS[approval.chainId];

  const handleClose = () => navigation.goBack();

  const handleViewExplorer = () => {
    if (explorerUrl) {
      Linking.openURL(`${explorerUrl}${approval.spender.address}`);
    }
  };

  const handleRevoke = () => {
    navigation.navigate(Routes.TOKEN_APPROVALS.MODALS.REVOKE_CONFIRM, {
      approvalId: approval.id,
    });
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Close button */}
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Icon
            name={IconName.Close}
            size={IconSize.Md}
            color={IconColor.Default}
          />
        </TouchableOpacity>

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
            style={styles.heroName}
          >
            {approval.asset.name} ({approval.asset.symbol})
          </Text>
          <RiskBadge verdict={approval.verdict} />
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
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('token_approvals.detail_chain')}
            </Text>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
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
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('token_approvals.detail_spender')}
            </Text>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {approval.spender.label ||
                renderShortAddress(approval.spender.address)}
            </Text>
          </View>

          {/* Allowance */}
          <View
            style={[
              styles.detailRow,
              styles.detailRowBorder,
              { borderBottomColor: colors.border.muted },
            ]}
          >
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('token_approvals.detail_allowance')}
            </Text>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {approval.allowance.is_unlimited
                ? strings('token_approvals.unlimited')
                : approval.allowance.amount}
            </Text>
          </View>

          {/* Exposure */}
          {approval.exposure_usd > 0 && (
            <View style={styles.detailRow}>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {strings('token_approvals.detail_exposure')}
              </Text>
              <Text variant={TextVariant.BodyMDBold} color={TextColor.Error}>
                ${approval.exposure_usd.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Spender Features */}
        {approval.spender.features.length > 0 && (
          <View style={styles.featuresSection}>
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              style={styles.featuresLabel}
            >
              {strings('token_approvals.detail_spender_features')}
            </Text>
            <View style={styles.featuresList}>
              {approval.spender.features.map((feature) => (
                <View
                  key={feature.id}
                  style={[
                    styles.featurePill,
                    { backgroundColor: colors.background.alternative },
                  ]}
                >
                  <Icon
                    name={IconName.Info}
                    size={IconSize.Xs}
                    color={IconColor.Muted}
                  />
                  <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                    {feature.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Block Explorer */}
        {explorerUrl && (
          <TouchableOpacity
            style={[
              styles.explorerButton,
              { backgroundColor: colors.background.alternative },
            ]}
            onPress={handleViewExplorer}
          >
            <Icon
              name={IconName.Export}
              size={IconSize.Sm}
              color={IconColor.Default}
            />
            <Text variant={TextVariant.BodySM} color={TextColor.Default}>
              {strings('token_approvals.detail_view_explorer')}
            </Text>
          </TouchableOpacity>
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
    </View>
  );
};

export default ApprovalDetailSheet;
