import { Text, TextVariant } from '@metamask/design-system-react-native';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import { setShowAccountOnLeaderboard } from '../../../../../actions/settings';
import Engine from '../../../../../core/Engine';
import { RootState } from '../../../../../reducers';
import { selectSocialLeaderboardEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';
import Logger from '../../../../../util/Logger';
import { SecurityOptionToggle } from '../../../../UI/SecurityOptionToggle';
import { useStyles } from '../../../../hooks/useStyles';
import createStyles from '../SecuritySettings.styles';
import { SecurityPrivacyViewSelectorsIDs } from '../SecurityPrivacyView.testIds';

/**
 * "Top Traders" section for the Security & privacy screen. Lets the user toggle
 * whether their account is shown on the Top Traders leaderboard, calling
 * `SocialController:optInToLeaderboard` / `optOutOfLeaderboard`. The displayed
 * value is a local (non-AUS) mirror kept in the `settings` reducer, defaulting
 * to shown; it is updated optimistically and reverted if the request fails.
 */
const TopTradersSection = () => {
  const { styles } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );
  const showAccountOnLeaderboard = useSelector(
    (state: RootState) => state.settings.showAccountOnLeaderboard ?? true,
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = useCallback(
    async (enabled: boolean) => {
      if (isUpdating) {
        return;
      }
      setIsUpdating(true);
      // Optimistic: the reducer value is the displayed state.
      dispatch(setShowAccountOnLeaderboard(enabled));
      try {
        await (Engine.controllerMessenger.call as CallableFunction)(
          enabled
            ? 'SocialController:optInToLeaderboard'
            : 'SocialController:optOutOfLeaderboard',
        );
      } catch (error) {
        Logger.error(
          error as Error,
          'TopTradersSection: failed to update leaderboard visibility',
        );
        // Revert on failure so the toggle reflects the unchanged backend state.
        dispatch(setShowAccountOnLeaderboard(!enabled));
      } finally {
        setIsUpdating(false);
      }
    },
    [dispatch, isUpdating],
  );

  if (!isSocialLeaderboardEnabled) {
    return null;
  }

  return (
    <View testID={SecurityPrivacyViewSelectorsIDs.TOP_TRADERS_SECTION}>
      <Text variant={TextVariant.HeadingMd} style={styles.subHeading}>
        {strings('social_leaderboard.settings.section_title')}
      </Text>
      {/* Wrap the toggle in `styles.setting` (marginTop) so the gap below the
          section heading matches the other sections (e.g. Analytics). */}
      <View style={styles.setting}>
        <SecurityOptionToggle
          title={strings(
            'social_leaderboard.settings.show_account_on_leaderboard',
          )}
          description={strings(
            'social_leaderboard.settings.show_account_on_leaderboard_description',
          )}
          value={showAccountOnLeaderboard}
          onOptionUpdated={handleToggle}
          testId={
            SecurityPrivacyViewSelectorsIDs.SHOW_ACCOUNT_ON_LEADERBOARD_TOGGLE
          }
          disabled={isUpdating}
        />
      </View>
    </View>
  );
};

export default TopTradersSection;
