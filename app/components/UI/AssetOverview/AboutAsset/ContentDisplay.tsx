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
  const [isTruncated, setIsTruncated] = useState<boolean | undefined>(
    undefined,
  );
  const hasMeasured = isTruncated !== undefined;

  useEffect(() => {
    setIsExpanded(false);
    setIsTruncated(undefined);
  }, [content, numberOfLines]);

  /**
   * The first layout pass runs unclamped, so its line count reflects the full
   * text: more lines than the limit means the clamped text overflows and needs
   * a toggle. Once measured, the clamp is applied and this is ignored.
   */
  const handleTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (hasMeasured) {
        return;
      }

      setIsTruncated(event.nativeEvent.lines.length > numberOfLines);
    },
    [hasMeasured, numberOfLines],
  );

  const toggleContent = () => {
    setIsExpanded((expanded) => !expanded);
  };

  const showToggle = Boolean(isTruncated) || isExpanded;
  // Leave the text unclamped until it has been measured so the line count is
  // accurate; afterwards clamp it unless the user has expanded it.
  const clampedLines = hasMeasured && !isExpanded ? numberOfLines : undefined;

  return (
    <View>
      <Text
        numberOfLines={clampedLines}
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
      {showToggle && (
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
      )}
    </View>
  );
};

export default ContentDisplay;
