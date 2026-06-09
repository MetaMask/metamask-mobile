import React, { forwardRef } from 'react';
import type { SectionRefreshHandle } from '../../types';
import type { PerpsSectionProps } from './PerpsSectionWithProvider';
import PerpsSectionMain from './PerpsSectionMain';
import PerpsSectionTrendingOnly from './PerpsSectionTrendingOnly';

export const PerpsSection = forwardRef<SectionRefreshHandle, PerpsSectionProps>(
  (props, ref) => {
    if (props.mode === 'trending-only') {
      return <PerpsSectionTrendingOnly {...props} ref={ref} />;
    }
    return <PerpsSectionMain {...props} ref={ref} />;
  },
);

PerpsSection.displayName = 'PerpsSection';

export default PerpsSection;
