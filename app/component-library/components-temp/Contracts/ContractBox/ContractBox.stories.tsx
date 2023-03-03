// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import ContractBox from './ContractBox';
import {
  CONTRACT_ADDRESS,
  CONTRACT_PET_NAME,
  CONTRACT_LOCAL_IMAGE,
  CONTRACT_COPY_ADDRESS,
  CONTRACT_EXPORT_ADDRESS,
  CONTRACT_ON_PRESS,
  HAS_BLOCK_EXPLORER,
} from './ContractBox.constants';

storiesOf('Component Library / Contract Box', module)
  .add('Address Not Saved', () => (
    <ContractBox
      contractAddress={CONTRACT_ADDRESS}
      contractLocalImage={CONTRACT_LOCAL_IMAGE}
      onCopyAddress={CONTRACT_COPY_ADDRESS}
      onExportAddress={CONTRACT_EXPORT_ADDRESS}
      onContractPress={CONTRACT_ON_PRESS}
      hasBlockExplorer={HAS_BLOCK_EXPLORER}
    />
  ))
  .add('Saved Address', () => (
    <ContractBox
      contractAddress={CONTRACT_ADDRESS}
      contractPetName={CONTRACT_PET_NAME}
      contractLocalImage={CONTRACT_LOCAL_IMAGE}
      onCopyAddress={CONTRACT_COPY_ADDRESS}
      onExportAddress={CONTRACT_EXPORT_ADDRESS}
      onContractPress={CONTRACT_ON_PRESS}
      hasBlockExplorer={HAS_BLOCK_EXPLORER}
    />
  ));
