import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { selectSelectedAccountGroup } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectIconSeedAddressByAccountGroupId } from '../../../../../selectors/multichainAccounts/accounts';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { RootState } from '../../../../../reducers';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { createAccountSelectorNavDetails } from '../../../../Views/AccountSelector';
import type { SnapshotEligibilityDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

/**
 * Props for the SnapshotAccountSection component
 */
interface SnapshotAccountSectionProps {
  /**
   * Eligibility data for the snapshot, used to determine if the section should be visible
   */
  eligibility?: SnapshotEligibilityDto | null;

  /**
   * Callback when the Enter button is pressed
   */
  onEnterPress?: () => void;
}

/**
 * SnapshotAccountSection displays the account selector and Enter button for snapshot commitment.
 * This section is only visible when `eligibility?.canCommit === true`.
 *
 * Features:
 * - Displays a description label
 * - Account row with avatar, name, and dropdown icon (pressable)
 * - Full-width Enter button
 *
 * @example
 * <SnapshotAccountSection
 *   eligibility={eligibility}
 *   onEnterPress={() => navigation.navigate(Routes.REWARDS_SNAPSHOT_COMMIT)}
 * />
 */
const SnapshotAccountSection: React.FC<SnapshotAccountSectionProps> = ({
  eligibility,
  onEnterPress,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation();

  // Account group selectors
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const avatarAccountType = useSelector(selectAvatarAccountType);

  // Get EVM address for avatar using the account group ID
  const evmAddress = useSelector((state: RootState) => {
    if (!selectedAccountGroup?.id) return undefined;
    try {
      const selector = selectIconSeedAddressByAccountGroupId(
        selectedAccountGroup.id,
      );
      return selector(state);
    } catch {
      return undefined;
    }
  });

  const handleOpenAccountSelector = useCallback(() => {
    navigation.navigate(
      ...createAccountSelectorNavDetails({
        disablePrivacyMode: true,
        disableAddAccountButton: true,
      }),
    );
  }, [navigation]);

  const handleEnterPress = useCallback(() => {
    onEnterPress?.();
  }, [onEnterPress]);

  // Only show when canCommit is true
  if (!eligibility?.canCommit) {
    return null;
  }

  return (
    <Box twClassName="w-full mt-6" testID="snapshot-account-section">
      {/* Description label */}
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName="text-text-alternative mb-4"
        testID="snapshot-account-section-description"
      >
        {strings('rewards.snapshots.select_account_description')}
      </Text>

      {/* Account Selector Row */}
      {selectedAccountGroup && (
        <TouchableOpacity
          onPress={handleOpenAccountSelector}
          style={tw.style(
            'flex-row items-center rounded-lg bg-background-muted p-4 mb-4',
          )}
          testID="snapshot-account-selector"
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
              testID="snapshot-account-name"
            >
              {selectedAccountGroup.metadata.name}
            </Text>
          </Box>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Lg}
            color={IconColor.IconAlternative}
            testID="snapshot-account-arrow"
          />
        </TouchableOpacity>
      )}

      {/* Enter Button */}
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        label={strings('rewards.snapshots.enter')}
        onPress={handleEnterPress}
        testID="snapshot-enter-button"
        twClassName="w-full"
      />
    </Box>
  );
};

export default SnapshotAccountSection;
