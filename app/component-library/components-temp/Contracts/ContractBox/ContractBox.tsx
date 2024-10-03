import React from 'react';
import Card from '@component-library/components/Cards/Card/Card';
import ContractBoxBase from '@component-library/components-temp/Contracts/ContractBoxBase/ContractBoxBase';
import styles from './ContractBox.styles';
import { View } from 'react-native';
import { ContractBoxProps } from './ContractBox.types';
import { CONTRACT_BOX_TEST_ID } from './ContractBox.constants';

const ContractBox = ({
  contractAddress,
  contractPetName,
  contractLocalImage,
  onExportAddress,
  onCopyAddress,
  onContractPress,
  hasBlockExplorer,
}: ContractBoxProps) => (
  <View testID={CONTRACT_BOX_TEST_ID}>
    <Card style={styles.container}>
      <ContractBoxBase
        contractAddress={contractAddress}
        contractPetName={contractPetName}
        contractLocalImage={contractLocalImage}
        onExportAddress={onExportAddress}
        onCopyAddress={onCopyAddress}
        onContractPress={onContractPress}
        hasBlockExplorer={hasBlockExplorer}
      />
    </Card>
  </View>
);

export default ContractBox;
