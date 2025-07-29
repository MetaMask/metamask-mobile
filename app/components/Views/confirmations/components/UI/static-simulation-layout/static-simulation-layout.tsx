import React from 'react';

import { strings } from '../../../../../../../locales/i18n';
import AnimatedSpinner, {
  SpinnerSize,
} from '../../../../../UI/AnimatedSpinner';
import InfoSection from '../info-row/info-section';
import InfoRow from '../info-row/info-row';

export const StaticSimulationLayout = ({
  children,
  isLoading = false,
  testID,
}: {
  children: React.ReactNode;
  isLoading?: boolean;
  testID?: string;
}) => (
  <InfoSection testID={testID}>
    <InfoRow
      label={strings('confirm.simulation.title')}
      tooltip={strings('confirm.simulation.tooltip')}
    >
      {isLoading && (
        <AnimatedSpinner
          testID="simulation-details-spinner"
          size={SpinnerSize.SM}
        />
      )}
    </InfoRow>
    {!isLoading && children}
  </InfoSection>
);
