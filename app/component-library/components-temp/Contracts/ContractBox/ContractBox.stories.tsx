// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import ContractBox from './ContractBox';
import {
  CONTRACT_ADDRESS,
  CONTRACT_PET_NAME,
  CONTRACT_LOCAL_IMAGE,
} from './ContractBox.constants';

storiesOf('Component Library / Contract Box', module)
  .add('Address Not Saved', () => (
    <ContractBox
      contractAddress={CONTRACT_ADDRESS}
      contractLocalImage={CONTRACT_LOCAL_IMAGE}
    />
  ))
  .add('Saved Address', () => (
    <ContractBox
      contractAddress={CONTRACT_ADDRESS}
      contractPetName={CONTRACT_PET_NAME}
      contractLocalImage={CONTRACT_LOCAL_IMAGE}
    />
  ));
