import React from 'react';
import MoneyIcon from '../../../../images/money-icon.svg';

export const MoneyAvatar = ({
  size,
  testID,
}: {
  size: number;
  testID?: string;
}) => <MoneyIcon width={size} height={size} testID={testID} name="MoneyIcon" />;
