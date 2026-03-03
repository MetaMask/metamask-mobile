import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Checkbox from '../../../../../component-library/components/Checkbox';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import { BadgePosition } from '../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import Badge from '../../../../../component-library/components/Badges/Badge';
import { BadgeVariant } from '../../../../../component-library/components/Badges/Badge/Badge.types';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { useTheme } from '../../../../../util/theme';
import { renderShortAddress } from '../../../../../util/address';
import { getNetworkImageSource } from '../../../../../util/networks';
import { strings } from '../../../../../../locales/i18n';
import { ApprovalItem, RevocationStatus } from '../../types';
import { formatUsd } from '../../utils/formatUsd';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 16,
    borderRadius: 12,
  },
  checkboxContainer: {
    marginRight: -4,
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
    gap: 6,
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
  revocationStatus,
  onPress,
  onSelect,
  onRevoke,
  selectionMode,
}) => {
  const { colors } = useTheme();

  const handlePress = useCallback(() => onPress(approval), [approval, onPress]);

  const handleSelect = useCallback(
    () => onSelect(approval.id),
    [approval.id, onSelect],
  );

  const handleRevoke = useCallback(
    () => onRevoke(approval),
    [approval, onRevoke],
  );

  const isRevoking =
    revocationStatus?.status === 'pending' ||
    revocationStatus?.status === 'submitted';

  const revokeButtonLabel = (() => {
    switch (revocationStatus?.status) {
      case 'pending':
      case 'submitted':
        return strings('token_approvals.revoking');
      case 'confirmed':
        return strings('token_approvals.revoked');
      case 'failed':
        return strings('token_approvals.revoke_failed');
      default:
        return strings('token_approvals.revoke');
    }
  })();

  const spenderLabel =
    approval.spender.label || renderShortAddress(approval.spender.address);

  const networkImageSource = getNetworkImageSource({
    chainId: approval.chainId,
  });

  const selectedStyle = isSelected
    ? { backgroundColor: colors.primary.muted }
    : undefined;

  const exposureUsd = Number(approval.exposure_usd) || 0;

  return (
    <TouchableOpacity
      style={[styles.container, selectedStyle]}
      onPress={selectionMode ? handleSelect : handlePress}
      onLongPress={handleSelect}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${approval.asset.symbol} approval for ${spenderLabel}`}
    >
      {selectionMode && (
        <View style={styles.checkboxContainer}>
          <Checkbox isChecked={isSelected} onPress={handleSelect} />
        </View>
      )}

      {/* Left: Token avatar with network badge */}
      <View style={styles.avatarContainer}>
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            networkImageSource ? (
              <Badge
                variant={BadgeVariant.Network}
                imageSource={networkImageSource}
                name={approval.chainName}
                size={AvatarSize.Xs}
                isScaled={false}
              />
            ) : undefined
          }
        >
          <AvatarToken
            size={AvatarSize.Lg}
            name={approval.asset.symbol}
            imageSource={
              approval.asset.logo_url
                ? { uri: approval.asset.logo_url }
                : undefined
            }
          />
        </BadgeWrapper>
      </View>

      {/* Center: Token name + value at risk, spender */}
      <View style={styles.centerColumn}>
        <View style={styles.tokenRow}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {approval.asset.symbol}
          </Text>
          {exposureUsd > 0 && (
            <Text variant={TextVariant.BodyXS} color={TextColor.Warning}>
              {formatUsd(exposureUsd)} at risk
            </Text>
          )}
        </View>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {spenderLabel}
        </Text>
      </View>

      {/* Right: Revoke button */}
      <View style={styles.rightColumn}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Sm}
          label={revokeButtonLabel}
          onPress={handleRevoke}
          isDisabled={isRevoking}
        />
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(ApprovalCard);
