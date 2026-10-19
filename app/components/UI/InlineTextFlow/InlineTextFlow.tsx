import React from 'react';
import { Text, type TextProps } from '@metamask/design-system-react-native';

type InlineTextFlowTextProps = Pick<
  TextProps,
  'color' | 'fontWeight' | 'twClassName' | 'variant'
>;

export interface InlineTextFlowProps extends InlineTextFlowTextProps {
  /**
   * Text to split into word-sized flex items.
   */
  text: string;
  /**
   * Prefix used to keep generated React keys unique within the parent flow.
   */
  keyPrefix: string;
  /**
   * Adds a gap before the first word.
   */
  leadingSpace?: boolean;
}

const REGEX_ONE_OR_MORE_CONSECUTIVE_WHITESPACE = /\s+/;

/**
 * Renders text as atomic word-sized items for a wrapping flex container.
 * This allows non-Text siblings, such as inline controls, to share the flow.
 */
const InlineTextFlow = ({
  text,
  keyPrefix,
  leadingSpace = false,
  color,
  fontWeight,
  twClassName,
  variant,
}: InlineTextFlowProps) => {
  const words = text.trim().split(REGEX_ONE_OR_MORE_CONSECUTIVE_WHITESPACE);

  return words.map((word, index) => (
    <Text
      key={`${keyPrefix}-${index}`}
      variant={variant}
      fontWeight={fontWeight}
      color={color}
      twClassName={[
        index === 0 && leadingSpace ? 'ml-1' : '',
        twClassName,
        'shrink-0',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {`${word} `}
    </Text>
  ));
};

export default InlineTextFlow;
