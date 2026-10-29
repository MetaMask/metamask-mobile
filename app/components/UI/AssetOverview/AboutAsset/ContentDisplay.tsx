import React, { useCallback, useEffect, useState } from 'react';
import { TextStyle, View, type TextLayoutEvent } from 'react-native';
import { TextButton } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import styleSheet from './ContentDisplay.styles';
import { strings } from '../../../../../locales/i18n';

export const CONTENT_DISPLAY_MEASURE_TEST_ID = 'content-display-measure';
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
   * Measure against an unrestricted (hidden) copy of the text. Measuring the
   * clamped text itself is unreliable: with `numberOfLines` set, RN caps the
   * reported lines, so the toggle would never appear.
   */
  const handleMeasureTextLayout = useCallback(
    (event: TextLayoutEvent) => {
      const lineCount = event.nativeEvent.lines.length;
      setIsTruncated(lineCount > numberOfLines);
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
      <View>
        {!hasMeasured ? (
          <Text
            color={TextColor.Alternative}
            style={[styles.measureText, textStyle]}
            onTextLayout={handleMeasureTextLayout}
            pointerEvents="none"
            accessible={false}
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
        >
          {content}
        </Text>
      </View>
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
