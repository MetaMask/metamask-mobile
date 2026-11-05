import React, { useMemo } from 'react';
import {
  Linking,
  type GestureResponderEvent,
  type TextStyle,
} from 'react-native';
import {
  FontWeight,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';

/**
 * Separator wrapped around each placeholder name before the sentence is split
 * again. U+0000 cannot appear in translated copy, so it can never collide with
 * the sentence itself.
 */
const TOKEN = '\u0000';

export interface SentenceLink {
  /** Visible link text. */
  label: string;
  /** Opened on press. Without it the label renders as emphasised plain text. */
  url?: string;
  testID?: string;
  /**
   * Color for this label. Set when it must stay distinct from the sentence,
   * which otherwise tints nested text.
   */
  color?: TextColor;
}

interface SentenceWithLinksProps {
  /** Key of a sentence whose placeholders match the `links` keys. */
  i18nKey: string;
  /** Placeholder name to link, e.g. `{ termsOfUse: { label, url } }`. */
  links: Record<string, SentenceLink>;
  variant?: TextVariant;
  color?: TextColor;
  twClassName?: string;
  testID?: string;
  /** Press on the sentence itself. A link's own press does not call this. */
  onPress?: (event: GestureResponderEvent) => void;
  suppressHighlighting?: boolean;
}

/**
 * Renders one translated sentence that contains inline links.
 *
 * The whole sentence is a single i18n key with `{{placeholder}}` slots rather
 * than sibling fragment keys ("prefix" + link + "separator" + link + "suffix").
 * Fragments break under translation: word order differs per locale, so
 * translators move clause content between the fragments. `onboarding.
 * privacy_notice` in this repo is the cautionary case — its link label carries
 * surrounding clause text in pt, ja and de, and so cannot be reused anywhere
 * else. A single interpolated sentence lets each locale place the links
 * wherever its grammar needs them.
 *
 * Placeholders are substituted with their own name fenced by {@link TOKEN}, so
 * splitting on that token yields alternating literal and placeholder segments.
 */
const SentenceWithLinks = ({
  i18nKey,
  links,
  variant = TextVariant.BodyXs,
  color = TextColor.TextAlternative,
  twClassName,
  testID,
  onPress,
  suppressHighlighting,
}: SentenceWithLinksProps) => {
  const tw = useTailwind();
  const segments = useMemo<string[]>(() => {
    const params = Object.fromEntries(
      Object.keys(links).map((name) => [name, `${TOKEN}${name}${TOKEN}`]),
    );
    const sentence: string = strings(i18nKey, params);
    return sentence.split(TOKEN);
  }, [i18nKey, links]);

  return (
    <Text
      variant={variant}
      color={color}
      twClassName={twClassName}
      testID={testID}
      onPress={onPress}
      suppressHighlighting={suppressHighlighting}
    >
      {segments.map((segment, index) => {
        const isPlaceholder =
          index % 2 === 1 &&
          Object.prototype.hasOwnProperty.call(links, segment);

        if (!isPlaceholder) {
          // Literal copy, or a placeholder a translation introduced that has no
          // link — rendered as-is so a bad translation never blanks the clause.
          return <React.Fragment key={index}>{segment}</React.Fragment>;
        }

        const link = links[segment];
        const linkStyle: TextStyle | undefined = link.color
          ? { color: tw.color(link.color) }
          : undefined;

        if (!link.url) {
          return (
            <Text
              key={index}
              variant={variant}
              fontWeight={FontWeight.Medium}
              color={link.color}
              style={linkStyle}
            >
              {link.label}
            </Text>
          );
        }

        return (
          <TextButton
            key={index}
            variant={variant}
            style={linkStyle}
            onPress={() => Linking.openURL(link.url as string)}
            accessibilityRole="link"
            testID={link.testID}
          >
            {link.label}
          </TextButton>
        );
      })}
    </Text>
  );
};

export default SentenceWithLinks;
