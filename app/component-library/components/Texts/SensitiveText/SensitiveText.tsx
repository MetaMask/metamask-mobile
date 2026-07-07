// external dependencies
import React, { useMemo } from 'react';
import Text from '../Text/Text';

// internal dependencies
import { SensitiveTextProps, SensitiveTextLength } from './SensitiveText.types';

/**
 * @deprecated Please update your code to use `SensitiveText` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/SensitiveText/README.md}
 */
const SensitiveText: React.FC<SensitiveTextProps> = ({
  isHidden = false,
  children = '',
  length = SensitiveTextLength.Short,
  ...props
}) => {
  const getFallbackLength = useMemo(
    () => (len: string) => {
      const numLength = Number(len);
      return Number.isNaN(numLength) ? 0 : numLength;
    },
    [],
  );

  const isValidCustomLength = (value: string): boolean => {
    const num = Number(value);
    return !Number.isNaN(num) && num > 0;
  };

  if (!(length in SensitiveTextLength) && !isValidCustomLength(length)) {
    console.warn(`Invalid length provided: ${length}. Falling back to Short.`);
    length = SensitiveTextLength.Short;
  }

  const fallback = useMemo(
    () => '•'.repeat(getFallbackLength(length)),
    [length, getFallbackLength],
  );
  return <Text {...props}>{isHidden ? fallback : children}</Text>;
};

export default SensitiveText;
