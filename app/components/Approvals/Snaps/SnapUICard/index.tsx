///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React from 'react';
import { Image } from 'react-native';
// External dependencies.
import {
  AlignItems,
  Display,
  FlexDirection,
  JustifyContent,
  TextAlign,
} from '../SnapUIRenderer/utils';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { SnapUICardProps } from './SnapUICard.props';
import styles, { Box } from '../../../UI/Box';

export const SnapUICard: React.FC<SnapUICardProps> = ({
  image,
  title,
  description,
  value,
  extra,
}) => (
  <Box
    testID="snaps-ui-card"
    justifyContent={JustifyContent.spaceBetween}
    alignItems={AlignItems.center}
  >
    <Box gap={4} alignItems={AlignItems.center}>
      {image && (
        <Image
          width={32}
          height={32}
          source={image}
          style={styles.overflowHidden}
        />
      )}
      <Box flexDirection={FlexDirection.Column} style={styles.overflowHidden}>
        <Text
          variant={TextVariant.BodyMDMedium}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        {description && (
          <Text
            color={TextColor.Alternative}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {description}
          </Text>
        )}
      </Box>
    </Box>
    <Box
      flexDirection={FlexDirection.Column}
      textAlign={TextAlign.right}
      style={styles.overflowHidden}
    >
      <Text
        variant={TextVariant.BodyMDMedium}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
      {extra && (
        <Text
          color={TextColor.Alternative}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {extra}
        </Text>
      )}
    </Box>
  </Box>
);
///: END:ONLY_INCLUDE_IF
