import React, { useContext, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import Text from '../../../Base/Text';
import createStyles from './ContentDisplay.styles';

interface ContentDisplayProps {
  content: string;
  numberOfLines?: number;
  disclaimer?: string;
}

const ContentDisplay = ({
  content,
  numberOfLines = 3,
  disclaimer,
}: ContentDisplayProps) => {
  const { colors = mockTheme.colors } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isExpanded, setIsExpanded] = useState(false);

  const toggleContent = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View>
      <Text
        numberOfLines={isExpanded ? undefined : numberOfLines}
        style={styles.content}
      >
        {content}
      </Text>
      {disclaimer && isExpanded && (
        <Text style={styles.disclaimer}>{disclaimer}</Text>
      )}
      <TouchableOpacity onPress={toggleContent}>
        <Text style={styles.button}>
          {isExpanded ? 'Show less' : 'Show more'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ContentDisplay;
