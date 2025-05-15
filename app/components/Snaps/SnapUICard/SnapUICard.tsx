import React, { FunctionComponent, ReactNode } from 'react';
import { Box } from '../../UI/Box/Box';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { SnapUIImage } from '../SnapUIImage/SnapUIImage';
import {
  FlexDirection,
  JustifyContent,
  AlignItems,
} from '../../UI/Box/box.types';
import { CommonSelectorsIDs } from '../../../../e2e/selectors/Common.selectors';

interface SnapUICardProps {
  image?: string | undefined;
  title: string | ReactNode;
  description?: string | undefined;
  value: string;
  extra?: string | undefined;
}

export const SnapUICard: FunctionComponent<SnapUICardProps> = ({
  image,
  title,
  description,
  value,
  extra,
}) => (
  <Box
    testID={CommonSelectorsIDs.SNAP_UI_CARD}
    flexDirection={FlexDirection.Row}
    justifyContent={JustifyContent.spaceBetween}
    alignItems={AlignItems.center}
    // eslint-disable-next-line react-native/no-inline-styles
    style={{ flex: 1 }}
  >
    <Box
      gap={16}
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
    >
      {image && (
        <SnapUIImage width={32} height={32} borderRadius={999} value={image} />
      )}
      <Box flexDirection={FlexDirection.Column}>
        <Text variant={TextVariant.BodyMDMedium} ellipsizeMode="tail">
          {title}
        </Text>
        {description && (
          <Text color={TextColor.Alternative} ellipsizeMode="tail">
            {description}
          </Text>
        )}
      </Box>
    </Box>
    <Box flexDirection={FlexDirection.Column}>
      <Text
        variant={TextVariant.BodyMDMedium}
        ellipsizeMode="tail"
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ textAlign: 'right' }}
      >
        {value}
      </Text>
      {extra && (
        <Text
          color={TextColor.Alternative}
          ellipsizeMode="tail"
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ textAlign: 'right' }}
        >
          {extra}
        </Text>
      )}
    </Box>
  </Box>
);
