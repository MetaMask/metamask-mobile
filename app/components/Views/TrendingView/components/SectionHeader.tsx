import React, { useCallback } from 'react';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import BaseSectionHeader from '../../../../component-library/components-temp/SectionHeader';
import {
  trackExploreSectionSeeAll,
  type ExploreTabName,
  type ExploreSectionName,
} from '../search/analytics';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** When provided, the title becomes tappable with a trailing chevron. */
  onViewAll?: () => void;
  testID?: string;
  /** Tab context for analytics — required when onViewAll is set. */
  tabName?: ExploreTabName;
  /** Section context for analytics — required when onViewAll is set. */
  sectionName?: ExploreSectionName;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  onViewAll,
  testID,
  tabName,
  sectionName,
}) => {
  const handleViewAll = useCallback(() => {
    if (tabName && sectionName) {
      trackExploreSectionSeeAll({ tabName, sectionName });
    }
    onViewAll?.();
  }, [onViewAll, tabName, sectionName]);

  return (
    <>
      <BaseSectionHeader
        testID={testID}
        title={title}
        onPress={onViewAll ? handleViewAll : undefined}
        twClassName={`px-0 ${subtitle ? 'mb-0.5' : 'mb-2'}`}
      />
      {subtitle && (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mt-1"
        >
          {subtitle}
        </Text>
      )}
    </>
  );
};

export default SectionHeader;
