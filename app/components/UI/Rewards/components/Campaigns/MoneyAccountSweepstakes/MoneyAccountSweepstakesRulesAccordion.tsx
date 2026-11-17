import React, { useMemo, useState } from 'react';
import { Pressable } from 'react-native';
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

// Blocks are read out of a Json document and handed back to the renderer as
// Json, so they have to stay assignable to both shapes.
type JsonRichTextBlock = RichTextBlock & Json;

interface RulesSection {
  title: string;
  blocks: JsonRichTextBlock[];
}

const isHeading = (block: RichTextBlock): boolean =>
  block.nodeType.startsWith('heading-');

const isRichTextBlock = (value: Json): value is JsonRichTextBlock =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  typeof value.nodeType === 'string';

const asDocument = (blocks: JsonRichTextBlock[]): Json => ({
  nodeType: 'document',
  data: {},
  content: blocks,
});

const getContentBlocks = (rulesDocument: Json): JsonRichTextBlock[] => {
  if (
    rulesDocument === null ||
    typeof rulesDocument !== 'object' ||
    Array.isArray(rulesDocument)
  ) {
    return [];
  }
  const { content } = rulesDocument;
  return Array.isArray(content) ? content.filter(isRichTextBlock) : [];
};

const parseRules = (
  rulesDocument: Json,
): {
  introTitle: string;
  introBlocks: JsonRichTextBlock[];
  sections: RulesSection[];
} => {
  const content = getContentBlocks(rulesDocument);

  const firstHeadingIndex = content.findIndex(isHeading);
  const introTitle =
    firstHeadingIndex >= 0
      ? documentToPlainText(content[firstHeadingIndex])
      : '';
  const sections: RulesSection[] = [];
  const introBlocks: JsonRichTextBlock[] = [];
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
          const isLast = index === sections.length - 1;
          return (
            <Box
              key={`${section.title}-${index}`}
              twClassName={isLast ? undefined : 'border-b border-border-muted'}
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
                {isExpanded && section.blocks.length > 0 ? (
                  <Box twClassName="pt-3">
                    <ContentfulRichText
                      document={asDocument(section.blocks)}
                      textVariant={TextVariant.BodySm}
                      bodyClassName="text-alternative"
                    />
                  </Box>
                ) : null}
              </Pressable>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default MoneyAccountSweepstakesRulesAccordion;
