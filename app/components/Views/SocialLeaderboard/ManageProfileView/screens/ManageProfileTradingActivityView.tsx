import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useState } from 'react';
import { Switch } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { useMyProfile } from '../../MyProfileView/hooks';
import ManageProfileScreenChrome from '../components/ManageProfileScreenChrome';
import { ManageProfileTradingActivitySelectorsIDs } from '../ManageProfileView.testIds';
import { useProfileController } from '../hooks/useProfileController';

const ManageProfileTradingActivityView: React.FC = () => {
  const { brandColors, colors } = useTheme();
  const { profile: localProfile } = useMyProfile();
  const { isControllerBacked, profile, updateProfile } = useProfileController();
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isTradingActivityPublic = isControllerBacked
    ? profile?.tradingPrivacy === 'public'
    : (localProfile?.shareTradingActivity ?? true);

  const handleTradingActivityChange = useCallback(
    async (value: boolean): Promise<void> => {
      if (!isControllerBacked) {
        return;
      }

      setIsUpdating(true);
      setErrorMessage(null);

      try {
        await updateProfile({
          trading_privacy: value ? 'public' : 'private',
        });
      } catch {
        setErrorMessage(
          strings('social_leaderboard.manage_profile.save_error'),
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [isControllerBacked, updateProfile],
  );

  return (
    <ManageProfileScreenChrome
      title={strings('social_leaderboard.manage_profile.trading_activity')}
      testID={ManageProfileTradingActivitySelectorsIDs.CONTAINER}
      headerTestID={ManageProfileTradingActivitySelectorsIDs.HEADER}
      backTestID={ManageProfileTradingActivitySelectorsIDs.BACK_BUTTON}
    >
      <Box twClassName="px-4 pt-2" gap={3}>
        <Box twClassName="bg-muted rounded-2xl px-4 py-3">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 mr-3"
              gap={1}
            >
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings(
                  'social_leaderboard.manage_profile.show_trading_activity',
                )}
              </Text>
              <ButtonIcon
                iconName={IconName.Info}
                size={ButtonIconSize.Sm}
                onPress={() => undefined}
                accessibilityLabel={strings(
                  'social_leaderboard.manage_profile.trading_activity_info',
                )}
                testID={ManageProfileTradingActivitySelectorsIDs.INFO_BUTTON}
              />
            </Box>
            <Switch
              value={isTradingActivityPublic}
              disabled={!isControllerBacked || isUpdating}
              onValueChange={handleTradingActivityChange}
              accessibilityState={{
                disabled: !isControllerBacked || isUpdating,
              }}
              accessibilityLabel={strings(
                'social_leaderboard.manage_profile.show_trading_activity',
              )}
              ios_backgroundColor={colors.border.muted}
              thumbColor={brandColors.white}
              trackColor={{
                false: colors.border.muted,
                true: colors.primary.default,
              }}
              testID={ManageProfileTradingActivitySelectorsIDs.SWITCH}
            />
          </Box>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-1"
          >
            {strings(
              'social_leaderboard.manage_profile.show_trading_activity_subtitle',
            )}
          </Text>
        </Box>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings(
            'social_leaderboard.manage_profile.trading_activity_footnote',
          )}
        </Text>
        {errorMessage ? (
          <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
            {errorMessage}
          </Text>
        ) : null}
      </Box>
    </ManageProfileScreenChrome>
  );
};

export default ManageProfileTradingActivityView;
