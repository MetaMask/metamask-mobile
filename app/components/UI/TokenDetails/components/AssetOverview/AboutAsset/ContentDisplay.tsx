import React, { useState } from 'react';
import { TextStyle, View } from 'react-native';
import ButtonLink from '../../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import styleSheet from './ContentDisplay.styles';
import { strings } from '../../../../../../../locales/i18n';

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

  const toggleContent = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View>
      <Text
        numberOfLines={isExpanded ? undefined : numberOfLines}
        color={TextColor.Alternative}
        style={[textStyle]}
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
      <ButtonLink
        onPress={toggleContent}
        label={strings(
          isExpanded
            ? 'asset_overview.about_content_display.show_less'
            : 'asset_overview.about_content_display.show_more',
        )}
      />
    </View>
  );
};

export default ContentDisplay;
