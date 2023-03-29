import React, { useState, useContext, useMemo } from 'react';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import Text from '../../../Base/Text';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      color: colors.primary.default,
      paddingTop: 8,
      textAlign: 'center',
    },
    content: {
      color: colors.text.alternative,
    },
    disclaimer: {
      color: colors.text.alternative,
      fontSize: 12,
      paddingTop: 16,
    },
  });

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
