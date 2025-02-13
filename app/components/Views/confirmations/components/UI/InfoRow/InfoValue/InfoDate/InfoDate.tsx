import React from 'react';
import { Text } from 'react-native';

import { formatUTCDateFromUnixTimestamp } from '../../../../../utils/date';

interface InfoDateProps {
  unixTimestamp: number;
}

const InfoDate = ({ unixTimestamp }: InfoDateProps) => (
  <Text>{formatUTCDateFromUnixTimestamp(unixTimestamp)}</Text>
);

export default InfoDate;
