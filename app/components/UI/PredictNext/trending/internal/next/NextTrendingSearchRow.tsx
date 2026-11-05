import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { formatPercentage } from '../../../../Predict/utils/format';
import { PredictEventValues } from '../../../analytics';
import { getTeamAbbreviation } from '../../../events/game';
import { TeamLogo } from '../../../events/shared/ui';
import type { PredictEvent } from '../../../types';
import { PredictTrendingTestIds } from '../../PredictTrending.testIds';
import { getTopOutcome } from './getTopOutcome';
import { useOpenNextTrendingEvent } from './useNextTrendingActions';

export interface NextTrendingSearchRowProps {
  event: PredictEvent;
}

/**
 * A next Venue's Event as an Explore search row, laid out as the Polymarket
 * row (`PredictMarketRowItem`): image, title, and the most likely Outcome's
 * chance. A Game without an Event image shows that Outcome's Team logo. A
 * press opens the Event through the `event` intent, attributed to
 * `explore_search`; Explore tracks the tap itself.
 */
export const NextTrendingSearchRow = ({
  event,
}: NextTrendingSearchRowProps) => {
  const tw = useTailwind();
  const openEvent = useOpenNextTrendingEvent(
    PredictEventValues.ENTRY_POINT.EXPLORE_SEARCH,
  );
  const topOutcome = useMemo(() => getTopOutcome(event), [event]);
  const handlePress = useCallback(() => {
    openEvent(event);
  }, [event, openEvent]);

  let leading: React.ReactNode = null;
  if (event.imageUrl) {
    leading = (
      <Image
        source={{ uri: event.imageUrl }}
        style={tw.style('w-full h-full')}
        contentFit="cover"
        recyclingKey={event.imageUrl}
      />
    );
  } else if (topOutcome?.team) {
    leading = (
      <TeamLogo
        team={topOutcome.team}
        abbreviation={getTeamAbbreviation(topOutcome.team)}
        size="medium"
      />
    );
  }

  return (
    <TouchableOpacity
      style={tw.style('flex-row items-center self-stretch py-2')}
      onPress={handlePress}
      testID={PredictTrendingTestIds.searchRow(event.id)}
    >
      <Box twClassName="h-10 w-10 rounded-full bg-muted overflow-hidden items-center justify-center">
        {leading}
      </Box>
      <View style={tw.style('flex-1 pl-4')}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {event.title}
        </Text>
        {topOutcome ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            style={tw.style('mt-0.5')}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {strings('predict_next.trending.search_row_chance', {
              probability: formatPercentage(topOutcome.percent, {
                truncate: true,
              }),
              outcome: topOutcome.label,
            })}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};
