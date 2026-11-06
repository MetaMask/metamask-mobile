import React, { memo } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './PredictSearchResultRow.styles';
import {
  getPredictSearchResultRowTestId,
  PredictSearchResultRowTestIds,
} from './PredictSearchResultRow.testIds';
import type { PredictSearchResult } from './types';

export interface PredictSearchResultRowProps {
  result: PredictSearchResult;
  /** The caller opens `result.intent`, and decides what else a press does. */
  onPress: () => void;
}

/**
 * A Predict search result in Browser URL autocomplete: the image (or a
 * placeholder icon), the title and the subtitle. Moved from the autocomplete
 * `Result` row in PRED-1386 with the same layout; it renders display values
 * only, so every Venue's results look the same.
 */
export const PredictSearchResultRow = memo(
  ({ result, onPress }: PredictSearchResultRowProps) => {
    const { styles } = useStyles(styleSheet);

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={onPress}
        testID={getPredictSearchResultRowTestId(result.id)}
      >
        <View style={styles.itemWrapper}>
          {result.imageUrl ? (
            <Image
              source={{ uri: result.imageUrl }}
              style={styles.icon}
              resizeMode="cover"
              testID={PredictSearchResultRowTestIds.IMAGE}
            />
          ) : (
            <Box
              style={styles.icon}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="bg-background-alternative"
              testID={PredictSearchResultRowTestIds.PLACEHOLDER_ICON}
            >
              <Icon name={IconName.Speedometer} size={IconSize.Md} />
            </Box>
          )}
          <View style={styles.textContent}>
            <Text style={styles.title} numberOfLines={1}>
              {result.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {result.subtitle}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);
PredictSearchResultRow.displayName = 'PredictSearchResultRow';
