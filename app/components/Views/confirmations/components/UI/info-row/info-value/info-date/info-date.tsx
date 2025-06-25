import React from 'react';

import Text from '../../../../../../../../component-library/components/Texts/Text';
import { formatUTCDateFromUnixTimestamp } from '../../../../../utils/date';

interface InfoDateProps {
  unixTimestamp: number;
}

const InfoDate = ({ unixTimestamp }: InfoDateProps) => (
  <Text>{formatUTCDateFromUnixTimestamp(unixTimestamp) as string}</Text>
);

export default InfoDate;
