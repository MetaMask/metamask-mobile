import React from 'react';
import { Pressable } from 'react-native';
import {
  Text,
  Icon,
  IconName,
  IconSize,
  IconColor,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';

interface ViewMoreCardProps {
  onPress: () => void;
  /** Tailwind classes for the card dimensions, e.g. "w-[180px] h-[140px]" */
  twClassName: string;
  textVariant?: TextVariant;
  testID?: string;
}

/**
 * Shared "View more" card shown at the end of a horizontal carousel.
 * Renders an ArrowRight icon above a label on a muted background.
 */
const ViewMoreCard: React.FC<ViewMoreCardProps> = ({
  onPress,
  twClassName,
  textVariant = TextVariant.BodyMd,
  testID,
}) => {
  const tw = useTailwind();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) =>
        tw.style(
          `rounded-xl items-center justify-center gap-2 ${twClassName}`,
          pressed ? 'bg-muted-pressed' : 'bg-muted',
        )
      }
    >
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Md}
        color={IconColor.IconDefault}
      />
      <Text
        variant={textVariant}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {strings('homepage.sections.view_more')}
      </Text>
    </Pressable>
  );
};

export default ViewMoreCard;
