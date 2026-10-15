import React, { type ReactNode } from 'react';
import {
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

interface MoneySecuritySetupTitleProps {
  children: ReactNode;
}

const MoneySecuritySetupTitle = ({
  children,
}: MoneySecuritySetupTitleProps) => (
  <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
    {children}
  </Text>
);

export default MoneySecuritySetupTitle;
