import React from 'react';
import { View } from 'react-native';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../component-library/base-components/TagBase';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { MUSD_TOKEN } from '../../constants/musd';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';

export const MUSD_TAG_SELECTOR = 'musd-tag';

interface MusdTagProps {
  /**
   * Amount of mUSD to display
   */
  amount: string;
  /**
   * Token symbol (defaults to 'mUSD')
   */
  symbol?: string;
  /**
   * Whether to show the background color
   * @default true
   */
  showBackground?: boolean;
  /**
   * Optional test ID for the component
   */
  testID?: string;
}

/**
 * Tag component that displays mUSD amount.
 * Used in mUSD conversion flow to show the output amount.
 */
const MusdTag: React.FC<MusdTagProps> = ({
  amount,
  symbol = 'mUSD',
  showBackground = true,
  testID,
}) => {
  const { colors } = useTheme();

  const tagStyle = {
    backgroundColor: showBackground ? colors.background.muted : 'transparent',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
  };

  return (
    <View>
      <TagBase
        shape={TagShape.Pill}
        includesBorder={false}
        textProps={{
          variant: TextVariant.BodySMMedium,
        }}
        severity={TagSeverity.Neutral}
        testID={testID || MUSD_TAG_SELECTOR}
        gap={6}
        style={tagStyle}
        startAccessory={
          <AvatarToken
            name={symbol}
            imageSource={MUSD_TOKEN.imageSource}
            size={AvatarSize.Xs}
          />
        }
      >
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
        >{`${amount} ${symbol}`}</Text>
      </TagBase>
    </View>
  );
};

export default MusdTag;
