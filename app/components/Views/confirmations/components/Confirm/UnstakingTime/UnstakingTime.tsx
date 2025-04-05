import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import InfoRow from '../../UI/InfoRow';
import InfoSection from '../../UI/InfoRow/InfoSection';

const UnstakingTimeSection = () => (
  <InfoSection>
    <InfoRow label={strings('stake.withdrawal_time')}>
      {strings('stake.estimated_unstaking_time')}
    </InfoRow>
  </InfoSection>
);

export default UnstakingTimeSection;
