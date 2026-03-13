import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TEST_ADDRESS from '../../../../constants/address';
import ContractBox from './ContractBox';
import {
  CONTRACT_BOX_TEST_ID,
  CONTRACT_PET_NAME,
  CONTRACT_LOCAL_IMAGE,
  CONTRACT_COPY_ADDRESS,
  CONTRACT_EXPORT_ADDRESS,
  CONTRACT_ON_PRESS,
} from './ContractBox.constants';

describe('ContractBox', () => {
  it('should render ContractBox', () => {
    render(
      <ContractBox
        contractAddress={TEST_ADDRESS}
        contractPetName={CONTRACT_PET_NAME}
        contractLocalImage={CONTRACT_LOCAL_IMAGE}
        onCopyAddress={CONTRACT_COPY_ADDRESS}
        onExportAddress={CONTRACT_EXPORT_ADDRESS}
        onContractPress={CONTRACT_ON_PRESS}
      />,
    );
    expect(screen.getByTestId(CONTRACT_BOX_TEST_ID)).toBeTruthy();
  });
});
