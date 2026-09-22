import React, { type PropsWithChildren } from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../../../../../../util/theme';

/**
 * Shared shimmer wrapper for Social V1 feed loading placeholders so skeleton
 * files stay layout-focused and Sonar duplication stays low.
 */
export const SocialFeedSkeletonPlaceholder: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const { colors } = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={colors.background.section}
      highlightColor={colors.background.subsection}
    >
      {children}
    </SkeletonPlaceholder>
  );
};
