import React from 'react';
import Text from '../../../components/Texts/Text';
import styles from './AccountTypeLabel.styles';
import { useTheme } from '../../../../util/theme';
import { AccountTypeLabelProps } from './AccountTypeLabel.types';

const AccountTypeLabel: React.FC<AccountTypeLabelProps> = ({
  children,
}: AccountTypeLabelProps) => {
  const theme = useTheme();
  const styleSheet = styles({ theme });
  return <Text style={styleSheet.accountNameLabelText}>{children}</Text>;
};

export default AccountTypeLabel;
