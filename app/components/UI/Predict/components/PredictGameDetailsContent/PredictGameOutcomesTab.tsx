import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import { OutcomesContent } from './PredictGameOutcomeCards';
import PredictMarketOutcomeResolved from '../PredictMarketOutcomeResolved';
import PredictResolvedOutcomesDropdown from '../PredictResolvedOutcomesDropdown';
import { usePricedOutcomeGroup } from './usePricedOutcomeGroup';
import { getOutcomeGroupLabel } from '../../utils/outcomeGroupLabel';
import { countOutcomeGroupOutcomes } from '../../utils/outcomeGroups';
import { getSportsMarketTypeLabelForGame } from './utils';

export { getSportsMarketTypeLabel } from './utils';

export interface OutcomesTabProps {
  groupMap: Map<string, PredictOutcomeGroup>;
  resolvedOutcomeGroups?: PredictOutcomeGroup[];
  game?: PredictMarketGame;
  activeChipKey: string;
  onBuyPress: (outcome: PredictOutcome, token: PredictOutcomeToken) => void;
  nonRegTimeSportsMarketTypes?: string[];
  onRegTimeInfoPress?: () => void;
}

const ResolvedOutcomeGroup = memo(
  ({
    group,
    game,
    isSubgroup = false,
  }: {
    group: PredictOutcomeGroup;
    game?: PredictMarketGame;
    isSubgroup?: boolean;
  }) => (
    <Box>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="font-medium pt-3 pb-1"
      >
        {isSubgroup
          ? getSportsMarketTypeLabelForGame(group.key, undefined, game)
          : getOutcomeGroupLabel(group.key)}
      </Text>
      {group.outcomes.map((outcome) => (
        <PredictMarketOutcomeResolved
          key={outcome.id}
          outcome={outcome}
          noContainer
        />
      ))}
      {group.subgroups?.map((subgroup) => (
        <ResolvedOutcomeGroup
          key={subgroup.key}
          group={subgroup}
          game={game}
          isSubgroup
        />
      ))}
    </Box>
  ),
);

ResolvedOutcomeGroup.displayName = 'ResolvedOutcomeGroup';

const PredictGameResultsDropdown = memo(
  ({
    groups,
    game,
  }: {
    groups: PredictOutcomeGroup[];
    game?: PredictMarketGame;
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const outcomeCount = useMemo(
      () =>
        groups.reduce(
          (count, group) => count + countOutcomeGroupOutcomes(group),
          0,
        ),
      [groups],
    );

    const handlePress = useCallback(() => {
      setIsExpanded((previousValue) => !previousValue);
    }, []);

    return (
      <PredictResolvedOutcomesDropdown
        count={outcomeCount}
        isExpanded={isExpanded}
        onToggle={handlePress}
        containerTestID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.RESULTS_DROPDOWN}
        countTestID={
          PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.RESULTS_DROPDOWN_COUNT
        }
        contentTestID={
          PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.RESULTS_DROPDOWN_CONTENT
        }
      >
        {groups.map((group) => (
          <ResolvedOutcomeGroup key={group.key} group={group} game={game} />
        ))}
      </PredictResolvedOutcomesDropdown>
    );
  },
);

PredictGameResultsDropdown.displayName = 'PredictGameResultsDropdown';

const PredictGameOutcomesTab = memo(
  ({
    groupMap,
    resolvedOutcomeGroups = [],
    game,
    activeChipKey,
    onBuyPress,
    nonRegTimeSportsMarketTypes = [],
    onRegTimeInfoPress,
  }: OutcomesTabProps) => {
    const selectedGroup = groupMap.get(activeChipKey);
    const pricedGroup = usePricedOutcomeGroup(selectedGroup);

    return (
      <Box testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}>
        {pricedGroup && (
          <Box twClassName="px-4">
            <OutcomesContent
              group={pricedGroup}
              onBuyPress={onBuyPress}
              game={game}
              nonRegTimeSportsMarketTypes={nonRegTimeSportsMarketTypes}
              onRegTimeInfoPress={onRegTimeInfoPress}
            />
          </Box>
        )}
        <Box twClassName="px-4">
          <PredictGameResultsDropdown
            groups={resolvedOutcomeGroups}
            game={game}
          />
        </Box>
      </Box>
    );
  },
);

PredictGameOutcomesTab.displayName = 'PredictGameOutcomesTab';

export default PredictGameOutcomesTab;
