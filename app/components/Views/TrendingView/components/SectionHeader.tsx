import React, { useCallback } from 'react';
import {
  SectionHeader as MMDSSectionHeader,
  Text,
  TextVariant,
  TextColor,
  Box,
} from '@metamask/design-system-react-native';
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
  /** Extra Tailwind classes for the title row (e.g. bottom padding overrides). */
  titleTwClassName?: string;
  /** Top inset already supplied by the following content, in spacing tokens. */
  contentTopInset?: 0 | 2 | 3;
  /** Extra Tailwind classes for the optional subtitle. */
  subtitleTwClassName?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  onViewAll,
  testID,
  tabName,
  sectionName,
  titleTwClassName,
  contentTopInset = 0,
  subtitleTwClassName,
}) => {
  const handleViewAll = useCallback(() => {
    if (tabName && sectionName) {
      trackExploreSectionSeeAll({ tabName, sectionName });
    }
    onViewAll?.();
  }, [onViewAll, tabName, sectionName]);

  // Match the homepage token icon gap: 8px header + 12px row inset.
  // Subtract padding owned by the following content rather than stacking it.
  const contentGapClassName = {
    0: 'pb-5',
    2: 'pb-3',
    3: 'pb-2',
  }[contentTopInset];
  const resolvedTitleTwClassName =
    titleTwClassName ?? (subtitle ? 'pb-1' : contentGapClassName);
  const resolvedSubtitleTwClassName =
    subtitleTwClassName ??
    (subtitle ? `${contentGapClassName} px-4` : undefined);

  return (
    <Box>
      <MMDSSectionHeader
        testID={testID}
        title={title}
        isInteractive={Boolean(onViewAll)}
        onPress={onViewAll ? handleViewAll : undefined}
        twClassName={resolvedTitleTwClassName}
      />
      {subtitle ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName={resolvedSubtitleTwClassName}
        >
          {subtitle}
        </Text>
      ) : null}
    </Box>
  );
};

export default SectionHeader;
