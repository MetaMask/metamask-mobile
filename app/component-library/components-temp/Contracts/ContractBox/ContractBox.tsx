// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import Card from '../../../components/Cards/Card';
import ContractBoxBase from '../ContractBoxBase';

// Internal dependencies.
import styles from './ContractBox.styles';
import { ContractBoxProps } from './ContractBox.types';
import { CONTRACT_BOX_TEST_ID } from './ContractBox.constants';

const ContractBox = ({
  contractAddress,
  contractPetName,
  contractLocalImage,
  onExportAddress,
  onCopyAddress,
}: ContractBoxProps) => (
  <View testID={CONTRACT_BOX_TEST_ID}>
    <Card style={styles.container}>
      <ContractBoxBase
        contractAddress={contractAddress}
        contractPetName={contractPetName}
        contractLocalImage={contractLocalImage}
        onExportAddress={onExportAddress}
        onCopyAddress={onCopyAddress}
      />
    </Card>
  </View>
);

export default ContractBox;
