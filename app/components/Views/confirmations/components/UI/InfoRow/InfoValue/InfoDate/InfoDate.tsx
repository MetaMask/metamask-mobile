import React from 'react';

import { formatUTCDateFromUnixTimestamp } from '../../../../../utils/date';
import InfoText from '../InfoText';

interface InfoDateProps {
  unixTimestamp: number;
}

const InfoDate = ({ unixTimestamp }: InfoDateProps) => (
  <InfoText>{formatUTCDateFromUnixTimestamp(unixTimestamp) as string}</InfoText>
);

export default InfoDate;
