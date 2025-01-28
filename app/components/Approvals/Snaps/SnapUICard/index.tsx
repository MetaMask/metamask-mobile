import React, { FunctionComponent, ReactNode } from 'react';
import { AlignItems, FlexDirection, TextAlign } from '../SnapUIRenderer/utils';
import styles, { Box } from '../../../UI/Box';
import { JustifyContent } from '../SnapUIRenderer/utils';
import Text, {
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import { SnapUIImage } from '../../../UI/Snaps/SnapUIImage';

export type SnapUICardProps = {
  image?: string | undefined;
  title: string | ReactNode;
  description?: string | undefined;
  value: string;
  extra?: string | undefined;
};

export const SnapUICard: FunctionComponent<SnapUICardProps> = ({
  image,
  title,
  description,
  value,
  extra,
}) => {
  return (
    <Box
      testID="snaps-ui-card"
      justifyContent={JustifyContent.spaceBetween}
      alignItems={AlignItems.center}
    >
      <Box
        gap={4}
        alignItems={AlignItems.center}
        style={{ overflow: 'hidden' }}
      >
        {image && (
          <SnapUIImage
            width={32}
            height={32}
            value={image}
            style={styles.overflowHidden}
          />
        )}
        <Box
          flexDirection={FlexDirection.Column}
          style={{ overflow: 'hidden' }}
        >
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
      <Box
        flexDirection={FlexDirection.Column}
        textAlign={TextAlign.right}
        style={{ overflow: 'hidden' }}
      >
        <Text variant={TextVariant.BodyMDMedium} ellipsizeMode="tail">
          {value}
        </Text>
        {extra && (
          <Text color={TextColor.Alternative} ellipsizeMode="tail">
            {extra}
          </Text>
        )}
      </Box>
    </Box>
  );
};
