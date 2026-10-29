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

export const CONTENT_DISPLAY_MEASURE_TEST_ID = 'content-display-measure';
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
  const [hasMeasured, setHasMeasured] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
    setIsTruncated(false);
    setHasMeasured(false);
  }, [content, numberOfLines]);

  /**
   * Truncation can only be measured on an unclamped copy: once `numberOfLines`
   * is applied, `onTextLayout` reports the clamped lines, so it can never
   * exceed the limit. This hidden copy carries no clamp, so a line count over
   * the limit means the visible (clamped) text overflows and needs a toggle.
   */
  const handleMeasureTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      setIsTruncated(event.nativeEvent.lines.length > numberOfLines);
      setHasMeasured(true);
    },
    [numberOfLines],
  );

  const toggleContent = () => {
    setIsExpanded((expanded) => !expanded);
  };

  const showToggle = isTruncated || isExpanded;

  return (
    <View>
      {!hasMeasured ? (
        <Text
          color={TextColor.Alternative}
          style={[styles.measureText, textStyle]}
          onTextLayout={handleMeasureTextLayout}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID={CONTENT_DISPLAY_MEASURE_TEST_ID}
        >
          {content}
        </Text>
      ) : null}
      <Text
        numberOfLines={isExpanded ? undefined : numberOfLines}
        color={TextColor.Alternative}
        style={[textStyle]}
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
