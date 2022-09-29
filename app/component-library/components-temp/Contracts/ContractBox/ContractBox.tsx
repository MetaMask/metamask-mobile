import React from 'react';
import Card from '../../../components/Cards/Card';
import ContractBoxBase from '../ContractBoxBase';
import styles from './ContractBox.styles';
import { View } from 'react-native';
import { ContractBoxBaseProps } from '../ContractBoxBase/ContractBoxBase.types';

const ContractBox = ({
  contractAddress,
  contractPetName,
  contractLocalImage,
}: ContractBoxBaseProps) => (
  <View>
    <Card style={styles.container}>
      <ContractBoxBase
        contractAddress={contractAddress}
        contractPetName={contractPetName}
        contractLocalImage={contractLocalImage}
      />
    </Card>
  </View>
);

export default ContractBox;
