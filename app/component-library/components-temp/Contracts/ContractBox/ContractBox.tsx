import React from 'react';
import CellDisplayContainer from '../../../components/Cells/Cell/foundation/CellDisplayContainer';
import Text, { TextVariant } from '../../../components/Texts/Text';
import ContractBoxBase from '../ContractBoxBase';
import styles from './ContractBox.styles';
import { View } from 'react-native';
import { ContractBaseProps } from '../ContractBoxBase/ContractBase.types';

const ContractBox = ({
  address,
  name,
  icon,
  type,
  description,
}: ContractBaseProps) => (
  <View>
    <Text variant={TextVariant.lBodyMD}>{description}</Text>
    <CellDisplayContainer style={styles.container}>
      <ContractBoxBase address={address} name={name} icon={icon} type={type} />
    </CellDisplayContainer>
  </View>
);

export default ContractBox;
