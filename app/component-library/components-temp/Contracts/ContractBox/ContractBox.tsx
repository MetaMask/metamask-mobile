import React from 'react';
import Card from '../../../components/Cards/Card';
import ContractBoxBase from '../ContractBoxBase';
import styles from './ContractBox.styles';
import { View } from 'react-native';
import { ContractBoxProps } from './ContractBox.types';
import { CONTRACT_BOX_TEST_ID } from './ContractBox.constants';

const ContractBox = ({
  contractAddress,
  contractPetName,
  contractLocalImage,
  handleExportAddress,
  handleCopyAddress,
}: ContractBoxProps) => (
  <View testID={CONTRACT_BOX_TEST_ID}>
    <Card style={styles.container}>
      <ContractBoxBase
        contractAddress={contractAddress}
        contractPetName={contractPetName}
        contractLocalImage={contractLocalImage}
        handleExportAddress={handleExportAddress}
        handleCopyAddress={handleCopyAddress}
      />
    </Card>
  </View>
);

export default ContractBox;
