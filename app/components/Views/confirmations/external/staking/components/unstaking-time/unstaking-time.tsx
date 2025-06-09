import React from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import InfoRow from '../../../../components/UI/info-row';
import InfoSection from '../../../../components/UI/info-row/info-section';

const UnstakingTimeSection = () => (
  <InfoSection>
    <InfoRow label={strings('stake.withdrawal_time')}>
      {strings('stake.estimated_unstaking_time')}
    </InfoRow>
  </InfoSection>
);

export default UnstakingTimeSection;
