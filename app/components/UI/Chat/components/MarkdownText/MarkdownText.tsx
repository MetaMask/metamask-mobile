import React from 'react';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface MarkdownTextProps {
  children: string;
  color: TextColor;
}

const INLINE_TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/gu;

/** Render `**bold**` and `` `code` `` spans inside one line. */
const renderInline = (line: string, color: TextColor) =>
  line.split(INLINE_TOKEN).map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return (
        <Text
          key={index}
          variant={TextVariant.BodyMd}
          color={color}
          fontWeight={FontWeight.Bold}
        >
          {segment.slice(2, -2)}
        </Text>
      );
    }
    if (segment.startsWith('`') && segment.endsWith('`')) {
      return (
        <Text
          key={index}
          variant={TextVariant.BodyMd}
          color={color}
          twClassName="font-mono"
        >
          {segment.slice(1, -1)}
        </Text>
      );
    }
    return <React.Fragment key={index}>{segment}</React.Fragment>;
  });

/**
 * Minimal markdown renderer for agent chat bubbles: headings, bold, inline
 * code, and bullet/numbered lists — the subset LLMs actually emit in chat.
 * Deliberately not a full markdown engine; if chat graduates from spike,
 * revisit with a real renderer or chat UI kit.
 */
const MarkdownText = ({ children, color }: MarkdownTextProps) => (
  <>
    {children.split('\n').map((rawLine, index) => {
      const line = rawLine.trim();
      if (line === '') return null;

      const heading = /^#{1,6}\s+(?<text>.*)$/u.exec(line);
      if (heading?.groups?.text !== undefined) {
        return (
          <Text
            key={index}
            variant={TextVariant.BodyMd}
            color={color}
            fontWeight={FontWeight.Bold}
            twClassName="mt-2 mb-1"
          >
            {renderInline(heading.groups.text, color)}
          </Text>
        );
      }

      const bullet = /^[-*]\s+(?<text>.*)$/u.exec(line);
      const body = bullet?.groups?.text;
      return (
        <Text
          key={index}
          variant={TextVariant.BodyMd}
          color={color}
          twClassName="mb-1"
        >
          {body === undefined ? (
            renderInline(line, color)
          ) : (
            <>
              {'•  '}
              {renderInline(body, color)}
            </>
          )}
        </Text>
      );
    })}
  </>
);

export default MarkdownText;
