// external dependencies
import React from 'react';
import Text from '../Text/Text';

// internal dependencies
import { SensitiveTextProps, SensitiveLengths } from './SensitiveText.types';

const SensitiveText: React.FC<SensitiveTextProps> = ({
  isHidden,
  children,
  length = SensitiveLengths.Short,
  ...props
}) => {
  const fallback = '*'.repeat(length);
  return <Text {...props}>{isHidden ? fallback : children}</Text>;
};

export default SensitiveText;
