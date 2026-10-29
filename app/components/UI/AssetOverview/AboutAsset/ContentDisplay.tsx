import React, { useCallback, useEffect, useState } from 'react';
import {
  TextStyle,
  View,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';
import { TextButton } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import styleSheet from './ContentDisplay.styles';
import { strings } from '../../../../../locales/i18n';

export const CONTENT_DISPLAY_TEXT_TEST_ID = 'content-display-text';
export const CONTENT_DISPLAY_TOGGLE_TEST_ID = 'content-display-toggle';

interface ContentDisplayProps {
  content: string;
  numberOfLines?: number;
  disclaimer?: string;
  textStyle?: TextStyle;
}

const ContentDisplay = ({
  content,
  numberOfLines = 3,
  disclaimer,
  textStyle,
}: ContentDisplayProps) => {
  const { styles } = useStyles(styleSheet, {});

  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
    setIsTruncated(false);
  }, [content, numberOfLines]);

  /**
   * Same truncation check as TruncatedError: compare the joined onTextLayout
   * lines against the source string. RN reports only the visible clamped
   * lines, so a shorter joined string means the description is truncated.
   */
  const handleTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (isExpanded) {
        return;
      }

      const renderedText = event.nativeEvent.lines
        .map((line) => line.text)
        .join('');
      setIsTruncated(renderedText.length < content.length);
    },
    [content, isExpanded],
  );

  const toggleContent = () => {
    setIsExpanded((expanded) => !expanded);
  };

  const showToggle = isTruncated || isExpanded;

  return (
    <View>
      <Text
        numberOfLines={isExpanded ? undefined : numberOfLines}
        color={TextColor.Alternative}
        style={[textStyle]}
        onTextLayout={handleTextLayout}
        testID={CONTENT_DISPLAY_TEXT_TEST_ID}
      >
        {content}
      </Text>
      {disclaimer && isExpanded && (
        <Text
          color={TextColor.Alternative}
          variant={TextVariant.BodyXS}
          style={styles.disclaimer}
        >
          {disclaimer}
        </Text>
      )}
      {showToggle ? (
        <TextButton
          onPress={toggleContent}
          testID={CONTENT_DISPLAY_TOGGLE_TEST_ID}
        >
          {strings(
            isExpanded
              ? 'asset_overview.about_content_display.show_less'
              : 'asset_overview.about_content_display.show_more',
          )}
        </TextButton>
      ) : null}
    </View>
  );
};

export default ContentDisplay;
