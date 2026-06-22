import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import { OutcomesContent } from './PredictGameOutcomeCards';
import PredictMarketOutcomeResolved from '../PredictMarketOutcomeResolved';
import { usePricedOutcomeGroup } from './usePricedOutcomeGroup';
import { getOutcomeGroupLabel } from '../../utils/outcomeGroupLabel';
import { countOutcomeGroupOutcomes } from '../../utils/outcomeGroups';
import { getSportsMarketTypeLabel } from './utils';

export { getSportsMarketTypeLabel } from './utils';

export interface OutcomesTabProps {
  groupMap: Map<string, PredictOutcomeGroup>;
  resolvedOutcomeGroups?: PredictOutcomeGroup[];
  game?: PredictMarketGame;
  activeChipKey: string;
  onBuyPress: (outcome: PredictOutcome, token: PredictOutcomeToken) => void;
}

const ResolvedOutcomeGroup = memo(
  ({
    group,
    isSubgroup = false,
  }: {
    group: PredictOutcomeGroup;
    isSubgroup?: boolean;
  }) => (
    <Box>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="font-medium pt-3 pb-1"
      >
        {isSubgroup
          ? getSportsMarketTypeLabel(group.key)
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
        <ResolvedOutcomeGroup key={subgroup.key} group={subgroup} isSubgroup />
      ))}
    </Box>
  ),
);

ResolvedOutcomeGroup.displayName = 'ResolvedOutcomeGroup';

const PredictGameResultsDropdown = memo(
  ({ groups }: { groups: PredictOutcomeGroup[] }) => {
    const tw = useTailwind();
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

    if (outcomeCount === 0) {
      return null;
    }

    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) =>
          tw.style(
            'w-full rounded-xl bg-muted px-4 py-3 mt-2 mb-4',
            pressed && 'bg-pressed',
          )
        }
        accessibilityRole="button"
        testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.RESULTS_DROPDOWN}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-3"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={TextColor.TextDefault}
            >
              {strings('predict.resolved_outcomes')}
            </Text>
            <Box twClassName="px-2 py-0.5 rounded bg-muted">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                testID={
                  PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.RESULTS_DROPDOWN_COUNT
                }
              >
                {outcomeCount}
              </Text>
            </Box>
          </Box>
          <Icon
            name={isExpanded ? IconName.ArrowUp : IconName.ArrowDown}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
        </Box>
        {isExpanded && (
          <Box
            testID={
              PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.RESULTS_DROPDOWN_CONTENT
            }
          >
            {groups.map((group) => (
              <ResolvedOutcomeGroup key={group.key} group={group} />
            ))}
          </Box>
        )}
      </Pressable>
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
            />
          </Box>
        )}
        <Box twClassName="px-4">
          <PredictGameResultsDropdown groups={resolvedOutcomeGroups} />
        </Box>
      </Box>
    );
  },
);

PredictGameOutcomesTab.displayName = 'PredictGameOutcomesTab';

export default PredictGameOutcomesTab;
