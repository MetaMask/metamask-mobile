import React, { Fragment, useCallback } from 'react';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { Json } from '@metamask/utils';
import Routes from '../../../../../constants/navigation/Routes';

// Contentful rich text node-type constants (from @contentful/rich-text-types)
const BLOCK_TYPES = {
  DOCUMENT: 'document',
  PARAGRAPH: 'paragraph',
  HEADING_1: 'heading-1',
  HEADING_2: 'heading-2',
  HEADING_3: 'heading-3',
  HEADING_4: 'heading-4',
  HEADING_5: 'heading-5',
  HEADING_6: 'heading-6',
  OL_LIST: 'ordered-list',
  UL_LIST: 'unordered-list',
  LIST_ITEM: 'list-item',
  HR: 'hr',
} as const;

const INLINE_TYPES = {
  HYPERLINK: 'hyperlink',
} as const;

const MARK_TYPES = {
  BOLD: 'bold',
  ITALIC: 'italic',
  UNDERLINE: 'underline',
} as const;

interface RichTextMark {
  type: string;
}

interface RichTextNode {
  nodeType: string;
  data: Record<string, unknown>;
  content?: RichTextNode[];
  value?: string;
  marks?: RichTextMark[];
}

interface ContentfulRichTextProps {
  document: Json;
  textVariant?: TextVariant;
  headingClassName?: string;
  bodyClassName?: string;
  testID?: string;
}

function isDocument(value: unknown): value is {
  nodeType: 'document';
  data: Record<string, unknown>;
  content: RichTextNode[];
} {
  return (
    value !== null &&
    typeof value === 'object' &&
    'nodeType' in value &&
    (value as { nodeType: unknown }).nodeType === BLOCK_TYPES.DOCUMENT &&
    'content' in value &&
    Array.isArray((value as { content: unknown }).content)
  );
}

function isTextNode(
  node: RichTextNode,
): node is RichTextNode & { value: string; marks: RichTextMark[] } {
  return (
    node.nodeType === 'text' &&
    typeof node.value === 'string' &&
    Array.isArray(node.marks)
  );
}

// Returns a fresh RegExp each call so stateful `lastIndex` never leaks between uses.
// Constructed via new RegExp() to avoid the no-control-regex lint rule firing on
// intentional control-character matching (U+0000–U+001F, U+007F, etc.).
const UNWANTED_CHARS_PATTERN =
  '[\u0000-\u001F\u007F\u0080-\u009F\u200B-\u200F\u2028\u2029\uFEFF\uFFFC-\uFFFD]+';
const UNWANTED_CHARS_RE = () => new RegExp(UNWANTED_CHARS_PATTERN, 'g');

/**
 * Renders a Contentful rich text Document as React Native components
 * using the MetaMask design system primitives.
 *
 * Supports paragraphs, headings, lists, hyperlinks, and text marks
 * (bold, italic, underline).
 */
const ContentfulRichText: React.FC<ContentfulRichTextProps> = ({
  document: doc,
  textVariant = TextVariant.BodyMd,
  headingClassName = 'text-default',
  bodyClassName = 'text-alternative',
  testID,
}) => {
  const navigation = useNavigation();

  const handleLinkPress = useCallback(
    (url: string) => {
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: url,
          timestamp: Date.now(),
        },
      });
    },
    [navigation],
  );

  if (!isDocument(doc)) {
    return null;
  }

  const sanitizeText = (s: string): string =>
    s.replace(UNWANTED_CHARS_RE(), '').replace(/\s{2,}/g, ' ');

  const renderMarkedText = (
    text: string,
    marks: RichTextMark[],
    key: string,
  ): React.ReactElement => {
    const isBold = marks.some((m) => m.type === MARK_TYPES.BOLD);
    const isItalic = marks.some((m) => m.type === MARK_TYPES.ITALIC);
    const isUnderline = marks.some((m) => m.type === MARK_TYPES.UNDERLINE);

    return (
      <Text
        key={key}
        variant={textVariant}
        twClassName={`${bodyClassName}${isItalic ? ' italic' : ''}${isUnderline ? ' underline' : ''}`}
        fontWeight={isBold ? FontWeight.Bold : undefined}
      >
        {sanitizeText(text)}
      </Text>
    );
  };

  const renderInlineChildren = (
    nodes: RichTextNode[],
    keyPrefix: string,
  ): React.ReactNode[] =>
    nodes.map((child, i) => {
      const childKey = `${keyPrefix}-${i}`;

      if (isTextNode(child)) {
        if (child.marks.length === 0) {
          return (
            <Fragment key={childKey}>{sanitizeText(child.value)}</Fragment>
          );
        }
        return renderMarkedText(child.value, child.marks, childKey);
      }

      if (child.nodeType === 'text' && typeof child.value === 'string') {
        return <Fragment key={childKey}>{sanitizeText(child.value)}</Fragment>;
      }

      if (child.nodeType === INLINE_TYPES.HYPERLINK) {
        const uri = (child.data as { uri?: string }).uri ?? '';
        return (
          <Text
            key={childKey}
            variant={textVariant}
            twClassName="text-primary-default"
            onPress={() => handleLinkPress(uri)}
          >
            {renderInlineChildren(child.content ?? [], childKey)}
          </Text>
        );
      }

      return null;
    });

  const renderBlock = (
    node: RichTextNode,
    key: string,
  ): React.ReactElement | null => {
    switch (node.nodeType) {
      case BLOCK_TYPES.PARAGRAPH:
        return (
          <Text key={key} variant={textVariant} twClassName={bodyClassName}>
            {renderInlineChildren(node.content ?? [], key)}
          </Text>
        );

      case BLOCK_TYPES.HEADING_1:
      case BLOCK_TYPES.HEADING_2:
      case BLOCK_TYPES.HEADING_3:
      case BLOCK_TYPES.HEADING_4:
      case BLOCK_TYPES.HEADING_5:
      case BLOCK_TYPES.HEADING_6: {
        const headingVariantMap: Record<string, TextVariant> = {
          [BLOCK_TYPES.HEADING_1]: TextVariant.HeadingLg,
          [BLOCK_TYPES.HEADING_2]: TextVariant.HeadingLg,
          [BLOCK_TYPES.HEADING_3]: TextVariant.HeadingMd,
          [BLOCK_TYPES.HEADING_4]: TextVariant.HeadingMd,
          [BLOCK_TYPES.HEADING_5]: TextVariant.HeadingSm,
          [BLOCK_TYPES.HEADING_6]: TextVariant.HeadingSm,
        };
        return (
          <Text
            key={key}
            variant={headingVariantMap[node.nodeType]}
            fontWeight={FontWeight.Bold}
            twClassName={`my-3 ${headingClassName}`}
          >
            {renderInlineChildren(node.content ?? [], key)}
          </Text>
        );
      }

      case BLOCK_TYPES.UL_LIST:
      case BLOCK_TYPES.OL_LIST:
        return (
          <Box key={key} twClassName="gap-1">
            {(node.content ?? []).map((item, i) => {
              const bullet =
                node.nodeType === BLOCK_TYPES.OL_LIST ? `${i + 1}. ` : '• ';
              return (
                <Box key={`${key}-li-${i}`} twClassName="flex-row">
                  <Text variant={textVariant} twClassName={bodyClassName}>
                    {bullet}
                  </Text>
                  <Box twClassName="flex-1 flex-shrink">
                    {(item.content ?? []).map((block, j) =>
                      renderBlock(block, `${key}-li-${i}-${j}`),
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        );

      case BLOCK_TYPES.HR:
        return (
          <Box key={key} twClassName="border-b border-border-muted my-2" />
        );

      default:
        return null;
    }
  };

  return (
    <Box testID={testID}>
      {doc.content.map((block, i) => renderBlock(block, `rt-${i}`))}
    </Box>
  );
};

/**
 * Recursively extracts plain text from a Contentful rich text document or node.
 * If the value is already a string, it is returned as-is.
 * Returns an empty string for null/undefined/non-object values.
 */
function documentToPlainText(value: unknown): string {
  if (typeof value === 'string')
    return value
      .replace(UNWANTED_CHARS_RE(), '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  if (value === null || value === undefined || typeof value !== 'object')
    return '';

  const node = value as {
    nodeType?: unknown;
    value?: unknown;
    content?: unknown[];
  };

  if (node.nodeType === 'text' && typeof node.value === 'string') {
    return node.value
      .replace(UNWANTED_CHARS_RE(), '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  if (Array.isArray(node.content)) {
    return node.content
      .map(documentToPlainText)
      .join(' ')
      .replace(/[\n\r\u2028\u2029]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  return '';
}

export { isDocument, documentToPlainText };
export default ContentfulRichText;
