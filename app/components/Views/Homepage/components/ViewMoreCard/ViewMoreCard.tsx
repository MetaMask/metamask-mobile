import React from 'react';
import { TouchableOpacity } from 'react-native';
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
  activeOpacity?: number;
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
  activeOpacity,
  testID,
}) => {
  const tw = useTailwind();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={activeOpacity}
      testID={testID}
      style={tw.style(
        `rounded-xl bg-background-muted items-center justify-center gap-2 ${twClassName}`,
      )}
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
    </TouchableOpacity>
  );
};

export default ViewMoreCard;
