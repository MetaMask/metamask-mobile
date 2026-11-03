import React from 'react';
import { Linking, Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxFlexWrap,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictEvent, PredictSettlementSource } from '../../../types';
import { EventAboutTestIds } from './EventAbout.testIds';

export interface EventAboutProps {
  event: Pick<PredictEvent, 'rules' | 'settlementSources'>;
}

/** Whether the Event has rules or settlement sources to show in About. */
export const hasEventAbout = ({
  rules,
  settlementSources,
}: EventAboutProps['event']) =>
  Boolean(rules?.trim()) || (settlementSources?.length ?? 0) > 0;

const openSource = (url: PredictSettlementSource['url']) => {
  Linking.openURL(url).catch(() => undefined);
};

/**
 * The Event's settlement sources and rules, laid out like the legacy market
 * details About tab.
 */
export const EventAbout = ({ event }: EventAboutProps) => {
  const rules = event.rules?.trim();
  const sources = event.settlementSources ?? [];

  return (
    <Box twClassName="gap-6 pb-8" testID={EventAboutTestIds.ROOT}>
      {sources.length > 0 ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-3"
          testID={EventAboutTestIds.SOURCES}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            <Icon
              name={IconName.Bank}
              size={IconSize.Md}
              color={IconColor.IconAlternative}
            />
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('predict.market_details.resolution_details')}
            </Text>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            flexWrap={BoxFlexWrap.Wrap}
            justifyContent={BoxJustifyContent.End}
            twClassName="shrink gap-x-3 gap-y-1"
          >
            {sources.map((source, index) => {
              const name = source.name.trim();
              return (
                <Pressable
                  key={`${source.url}-${name}-${index}`}
                  testID={EventAboutTestIds.sourceLink(index)}
                  accessibilityRole="link"
                  accessibilityLabel={name}
                  accessibilityHint={strings(
                    'predict.rules.settlement_sources.open_hint',
                  )}
                  onPress={() => openSource(source.url)}
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="gap-1"
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.PrimaryDefault}
                    >
                      {name}
                    </Text>
                    <Icon
                      name={IconName.ArrowSquareOut}
                      size={IconSize.Sm}
                      color={IconColor.PrimaryDefault}
                    />
                  </Box>
                </Pressable>
              );
            })}
          </Box>
        </Box>
      ) : null}
      {sources.length > 0 && rules ? (
        <Box twClassName="w-full border-t border-muted" />
      ) : null}
      {rules ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={EventAboutTestIds.RULES}
        >
          {rules}
        </Text>
      ) : null}
    </Box>
  );
};
