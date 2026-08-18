import React, { useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import type { Json } from '@metamask/utils';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ContentfulRichText, {
  documentToPlainText,
} from '../../ContentfulRichText/ContentfulRichText';

interface RichTextBlock {
  nodeType: string;
  data?: Record<string, unknown>;
  content?: RichTextBlock[];
  value?: string;
  marks?: { type: string }[];
}

interface RulesSection {
  title: string;
  blocks: RichTextBlock[];
}

const isHeading = (block: RichTextBlock): boolean =>
  block.nodeType.startsWith('heading-');

const asDocument = (blocks: RichTextBlock[]): Json =>
  ({ nodeType: 'document', data: {}, content: blocks }) as Json;

const RULES_ACCORDION_ANIMATION_DURATION_MS = 180;
const rulesAccordionLayoutTransition = LinearTransition.duration(
  RULES_ACCORDION_ANIMATION_DURATION_MS,
);
const rulesAccordionContentEntering = FadeIn.duration(
  RULES_ACCORDION_ANIMATION_DURATION_MS,
);
const rulesAccordionContentExiting = FadeOut.duration(
  RULES_ACCORDION_ANIMATION_DURATION_MS,
);

const parseRules = (
  rulesDocument: Json,
): {
  introTitle: string;
  introBlocks: RichTextBlock[];
  sections: RulesSection[];
} => {
  const content =
    rulesDocument &&
    typeof rulesDocument === 'object' &&
    'content' in rulesDocument &&
    Array.isArray(rulesDocument.content)
      ? (rulesDocument.content as RichTextBlock[])
      : [];

  const firstHeadingIndex = content.findIndex(isHeading);
  const introTitle =
    firstHeadingIndex >= 0
      ? documentToPlainText(content[firstHeadingIndex])
      : '';
  const sections: RulesSection[] = [];
  const introBlocks: RichTextBlock[] = [];
  let currentSection: RulesSection | null = null;

  content
    .slice(firstHeadingIndex >= 0 ? firstHeadingIndex + 1 : 0)
    .forEach((block) => {
      if (isHeading(block)) {
        if (currentSection) sections.push(currentSection);
        currentSection = {
          title: documentToPlainText(block),
          blocks: [],
        };
      } else if (currentSection) {
        currentSection.blocks.push(block);
      } else {
        introBlocks.push(block);
      }
    });

  if (currentSection) sections.push(currentSection);

  return { introTitle, introBlocks, sections };
};

interface MoneyAccountSweepstakesRulesAccordionProps {
  rulesDocument: Json;
}

const MoneyAccountSweepstakesRulesAccordion: React.FC<
  MoneyAccountSweepstakesRulesAccordionProps
> = ({ rulesDocument }) => {
  const tw = useTailwind();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { introTitle, introBlocks, sections } = useMemo(
    () => parseRules(rulesDocument),
    [rulesDocument],
  );

  return (
    <Box twClassName="gap-4">
      {(introTitle || introBlocks.length > 0) && (
        <Box twClassName="gap-2 pb-2">
          {introTitle ? (
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {introTitle}
            </Text>
          ) : null}
          {introBlocks.length > 0 ? (
            <ContentfulRichText
              document={asDocument(introBlocks)}
              textVariant={TextVariant.BodySm}
            />
          ) : null}
        </Box>
      )}

      <Box>
        {sections.map((section, index) => {
          const isExpanded = expandedIndex === index;
          const isLastSection = index === sections.length - 1;
          return (
            <Animated.View
              key={`${section.title}-${index}`}
              layout={rulesAccordionLayoutTransition}
            >
              <Box
                twClassName={
                  isLastSection ? undefined : 'border-b border-border-muted'
                }
              >
                <Pressable
                  onPress={() => setExpandedIndex(isExpanded ? null : index)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                  testID={`money-sweepstakes-rule-${index}`}
                  style={({ pressed }) =>
                    tw.style('py-4', pressed && 'opacity-70')
                  }
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    justifyContent={BoxJustifyContent.Between}
                    twClassName="gap-3"
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      twClassName="min-w-0 flex-1"
                    >
                      {section.title}
                    </Text>
                    <Icon
                      name={isExpanded ? IconName.ArrowUp : IconName.ArrowDown}
                      size={IconSize.Sm}
                      color={IconColor.IconAlternative}
                    />
                  </Box>
                </Pressable>
                {isExpanded && section.blocks.length > 0 ? (
                  <Animated.View
                    entering={rulesAccordionContentEntering}
                    exiting={rulesAccordionContentExiting}
                    layout={rulesAccordionLayoutTransition}
                  >
                    <Box twClassName="pb-4">
                      <ContentfulRichText
                        document={asDocument(section.blocks)}
                        textVariant={TextVariant.BodySm}
                        bodyClassName="text-alternative"
                      />
                    </Box>
                  </Animated.View>
                ) : null}
              </Box>
            </Animated.View>
          );
        })}
      </Box>
    </Box>
  );
};

export default MoneyAccountSweepstakesRulesAccordion;
