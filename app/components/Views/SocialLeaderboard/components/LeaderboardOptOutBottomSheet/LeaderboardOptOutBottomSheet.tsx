import {
  BottomSheet,
  Button,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';
import Logger from '../../../../../util/Logger';
import { LeaderboardOptOutBottomSheetSelectorsIDs } from './LeaderboardOptOutBottomSheet.testIds';

/**
 * Owner-only leaderboard opt-out sheet, opened from the cog on a trader's
 * profile (when the viewer owns one of the profile's addresses) and from the
 * Top Traders app-settings screen. Calls `SocialController:optOutOfLeaderboard`
 * to remove the current user's addresses from the PnL leaderboard.
 */
const LeaderboardOptOutBottomSheet = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptOut = useCallback(async () => {
    if (isSubmitting) {
      return;
    }
    playImpact(ImpactMoment.QuickAmountSelection);
    setIsSubmitting(true);
    try {
      await (Engine.controllerMessenger.call as CallableFunction)(
        'SocialController:optOutOfLeaderboard',
      );
      sheetRef.current?.onCloseBottomSheet();
    } catch (error) {
      Logger.error(
        error as Error,
        'LeaderboardOptOutBottomSheet: optOutOfLeaderboard failed',
      );
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  return (
    <BottomSheet
      ref={sheetRef}
      isInteractable
      goBack={navigation.goBack}
      testID={LeaderboardOptOutBottomSheetSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        title={strings('social_leaderboard.opt_out.title')}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
        closeButtonProps={{
          testID: LeaderboardOptOutBottomSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      />

      <View style={tw.style('px-4 pb-4')}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mb-4"
        >
          {strings('social_leaderboard.opt_out.description')}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          isDanger
          isFullWidth
          isLoading={isSubmitting}
          isDisabled={isSubmitting}
          onPress={handleOptOut}
          testID={LeaderboardOptOutBottomSheetSelectorsIDs.OPT_OUT_BUTTON}
        >
          {strings('social_leaderboard.opt_out.cta')}
        </Button>
      </View>
    </BottomSheet>
  );
};

export default LeaderboardOptOutBottomSheet;
