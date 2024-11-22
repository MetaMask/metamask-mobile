///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React from 'react';
import { Image } from 'react-native';
// External dependencies.
import { SnapUICardProps } from './SnapUICardProps.types';
import styles, { Box } from '../../Box';
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

export const SnapUICard: React.FC<SnapUICardProps> = ({
  image,
  title,
  description,
  value,
  extra,
}) => (
  <Box
    testID="snaps-ui-card"
    display={Display.Flex}
    justifyContent={JustifyContent.spaceBetween}
    alignItems={AlignItems.center}
  >
    <Box display={Display.Flex} gap={4} alignItems={AlignItems.center}>
      {image && (
        <Image
          width={32}
          height={32}
          source={image}
          style={styles.overflowHidden}
        />
      )}
      <Box
        display={Display.Flex}
        flexDirection={FlexDirection.Column}
        style={styles.overflowHidden}
      >
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
      display={Display.Flex}
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
