import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Checkbox from '../../../../../component-library/components/Checkbox';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { useTheme } from '../../../../../util/theme';
import { renderShortAddress } from '../../../../../util/address';
import { strings } from '../../../../../../locales/i18n';
import { ApprovalItem, RevocationStatus, Verdict } from '../../types';
import { formatUsd } from '../../utils/formatUsd';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  checkboxContainer: {
    width: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
  },
  centerColumn: {
    flex: 1,
    gap: 2,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
});

interface ApprovalCardProps {
  approval: ApprovalItem;
  isSelected: boolean;
  revocationStatus?: RevocationStatus;
  onPress: (approval: ApprovalItem) => void;
  onSelect: (id: string) => void;
  onRevoke: (approval: ApprovalItem) => void;
  selectionMode: boolean;
}

const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  isSelected,
  onPress,
  onSelect,
  selectionMode,
}) => {
  const { colors } = useTheme();

  const handlePress = useCallback(() => onPress(approval), [approval, onPress]);

  const handleSelect = useCallback(
    () => onSelect(approval.id),
    [approval.id, onSelect],
  );

  const spenderLabel =
    approval.spender.label || renderShortAddress(approval.spender.address);

  const allowanceLabel = approval.allowance.is_unlimited
    ? strings('token_approvals.unlimited')
    : approval.allowance.amount;

  const exposureUsd = Number(approval.exposure_usd) || 0;

  const exposureColor =
    approval.verdict === Verdict.Malicious
      ? TextColor.Error
      : approval.verdict === Verdict.Warning
        ? TextColor.Warning
        : TextColor.Default;

  const selectedStyle = isSelected
    ? { backgroundColor: colors.primary.muted }
    : undefined;

  return (
    <TouchableOpacity
      style={[styles.container, selectedStyle]}
      onPress={selectionMode ? handleSelect : handlePress}
      onLongPress={handleSelect}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${approval.asset.symbol} approval for ${spenderLabel}`}
    >
      {/* Checkbox */}
      <View style={styles.checkboxContainer}>
        <Checkbox isChecked={isSelected} onPress={handleSelect} />
      </View>

      {/* Token avatar */}
      <View style={styles.avatarContainer}>
        <AvatarToken
          size={AvatarSize.Lg}
          name={approval.asset.symbol}
          imageSource={
            approval.asset.logo_url
              ? { uri: approval.asset.logo_url }
              : undefined
          }
        />
      </View>

      {/* Center: Token name + allowance, spender */}
      <View style={styles.centerColumn}>
        <View style={styles.tokenRow}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {approval.asset.symbol}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {allowanceLabel}
          </Text>
        </View>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {spenderLabel}
        </Text>
      </View>

      {/* Right: Exposure value */}
      <View style={styles.rightColumn}>
        {exposureUsd > 0 && (
          <Text variant={TextVariant.BodyMDMedium} color={exposureColor}>
            {formatUsd(exposureUsd)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(ApprovalCard);
