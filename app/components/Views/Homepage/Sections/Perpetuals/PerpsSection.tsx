import React, { forwardRef } from 'react';
import type { SectionRefreshHandle } from '../../types';
import type { PerpsSectionProps } from './PerpsSectionWithProvider';
import PerpsSectionMain from './PerpsSectionMain';

export const PerpsSection = forwardRef<SectionRefreshHandle, PerpsSectionProps>(
  (props, ref) => <PerpsSectionMain {...props} ref={ref} />,
);

PerpsSection.displayName = 'PerpsSection';

export default PerpsSection;
