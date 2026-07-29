import React, { forwardRef } from 'react';
import { useSelector } from 'react-redux';
import { SectionRefreshHandle } from '../../types';
import { selectDeFiPositionsSectionEnabled } from '../../../../../selectors/deFiPositionsSectionEnabled';
import { selectDeFiPositionsV2SectionEnabled } from '../../../../../selectors/deFiPositionsV2SectionEnabled';
import DeFiSectionV1 from './DeFiSectionV1';
import DeFiSectionV2 from './DeFiSectionV2';
import { DeFiSectionProps } from './DeFiSection.shared';

/**
 * DeFiSection - homepage DeFi positions section.
 *
 * Thin flag-driven wrapper that selects the V1 or V2 implementation. The two
 * flags are mutually exclusive by design (see the section-enabled selectors):
 * V2 wins when its flag is on, otherwise V1 renders when its flag is on, and
 * neither renders when both are off.
 */
const DeFiSection = forwardRef<SectionRefreshHandle, DeFiSectionProps>(
  (props, ref) => {
    const isV2Enabled = useSelector(selectDeFiPositionsV2SectionEnabled);
    const isV1Enabled = useSelector(selectDeFiPositionsSectionEnabled);

    if (isV2Enabled) {
      return <DeFiSectionV2 ref={ref} {...props} />;
    }

    if (isV1Enabled) {
      return <DeFiSectionV1 ref={ref} {...props} />;
    }

    return null;
  },
);

DeFiSection.displayName = 'DeFiSection';

export default DeFiSection;
