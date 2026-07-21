import React from 'react';
import { Tag, TagSeverity } from '@metamask/design-system-react-native';

interface PerpsLeverageProps {
  maxLeverage: string;
  testID?: string;
}

const PerpsLeverage = ({
  maxLeverage,
  testID = 'perps-leverage',
}: PerpsLeverageProps) => (
  <Tag severity={TagSeverity.Neutral} testID={testID} twClassName="self-center">
    {maxLeverage}
  </Tag>
);

export default PerpsLeverage;
