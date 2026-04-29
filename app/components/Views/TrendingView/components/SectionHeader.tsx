import React from 'react';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import BaseSectionHeader from '../../../../component-library/components-temp/SectionHeader';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** When provided, the title becomes tappable with a trailing chevron. */
  onViewAll?: () => void;
  testID?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  onViewAll,
  testID,
}) => (
  <>
    <BaseSectionHeader
      testID={testID}
      title={title}
      onPress={onViewAll}
      twClassName={`px-0 ${subtitle ? 'mb-0.5' : 'mb-2'}`}
    />
    {subtitle && (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="mb-2"
      >
        {subtitle}
      </Text>
    )}
  </>
);

export default SectionHeader;
