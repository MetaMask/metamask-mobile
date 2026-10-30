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
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import ManageProfileScreenChrome from '../components/ManageProfileScreenChrome';
import { ManageProfileTradingActivitySelectorsIDs } from '../ManageProfileView.testIds';
import { useProfileController } from '../hooks/useProfileController';
import { useManageProfileAnalytics } from '../../../../../hooks/useManageProfileAnalytics';
import TradingActivityBenefits from '../../shared/TradingActivityBenefits';

// Box always applies `flex: 1`. Without this the toggle card grows to the
// screen, the switch sits in that stretched row, and the benefit list plus
// any save error render below the fold — a tap then looks like it did nothing.
const styles = StyleSheet.create({
  hug: {
    flex: 0,
  },
});

const ManageProfileTradingActivityView: React.FC = () => {
  const { brandColors, colors } = useTheme();
  const { isControllerBacked, profile, updateProfile } = useProfileController();
  const trackProfileEdited = useManageProfileAnalytics();
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticTradingActivity, setOptimisticTradingActivity] = useState<
    boolean | undefined
  >();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Identity already lives on ProfileController. Calling useMyProfile here
  // would start another getProfile, and that in-flight response lands after
  // the toggle and writes the previous trading privacy back over the edit.
  const controllerTradingActivityPublic = isControllerBacked
    ? profile?.tradingPrivacy === 'public'
    : true;
  const isTradingActivityPublic =
    optimisticTradingActivity ?? controllerTradingActivityPublic;

  useEffect(() => {
    if (
      optimisticTradingActivity !== undefined &&
      controllerTradingActivityPublic === optimisticTradingActivity
    ) {
      setOptimisticTradingActivity(undefined);
    }
  }, [controllerTradingActivityPublic, optimisticTradingActivity]);

  const handleTradingActivityChange = useCallback(
    async (value: boolean): Promise<void> => {
      if (!isControllerBacked) {
        return;
      }

      setOptimisticTradingActivity(value);
      setIsUpdating(true);
      setErrorMessage(null);

      try {
        await updateProfile({
          trading_privacy: value ? 'public' : 'private',
        });
        trackProfileEdited();
      } catch {
        setOptimisticTradingActivity(undefined);
        setErrorMessage(
          strings('social_leaderboard.manage_profile.save_error'),
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [isControllerBacked, trackProfileEdited, updateProfile],
  );

  return (
    <ManageProfileScreenChrome
      title={strings('social_leaderboard.manage_profile.trading_activity')}
      testID={ManageProfileTradingActivitySelectorsIDs.CONTAINER}
      headerTestID={ManageProfileTradingActivitySelectorsIDs.HEADER}
      backTestID={ManageProfileTradingActivitySelectorsIDs.BACK_BUTTON}
    >
      <Box twClassName="px-4 pt-2" gap={3}>
        <Box twClassName="bg-muted rounded-2xl px-4 py-3" style={styles.hug}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            style={styles.hug}
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
          {errorMessage ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              twClassName="mt-2"
            >
              {errorMessage}
            </Text>
          ) : null}
        </Box>
        <TradingActivityBenefits
          isTradingActivityShown={isTradingActivityPublic}
          testID={ManageProfileTradingActivitySelectorsIDs.BENEFITS}
        />
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings(
            'social_leaderboard.manage_profile.trading_activity_footnote',
          )}
        </Text>
      </Box>
    </ManageProfileScreenChrome>
  );
};

export default ManageProfileTradingActivityView;
