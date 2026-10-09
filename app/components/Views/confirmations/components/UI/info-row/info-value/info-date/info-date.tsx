import React from 'react';

import { formatUTCDateFromUnixTimestamp } from '../../../../../utils/date';
import { Text } from '@metamask/design-system-react-native';

interface InfoDateProps {
  unixTimestamp: number;
}

const InfoDate = ({ unixTimestamp }: InfoDateProps) => (
  <Text>{formatUTCDateFromUnixTimestamp(unixTimestamp) as string}</Text>
);

export default InfoDate;
