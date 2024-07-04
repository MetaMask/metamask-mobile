import React from 'react';
import { render } from '@testing-library/react-native';
import ContractBoxBase from './ContractBoxBase';
import TEST_ADDRESS from '../../../../constants/address';
import {
  CONTRACT_PET_NAME,
  CONTRACT_LOCAL_IMAGE,
  CONTRACT_COPY_ADDRESS,
  CONTRACT_ON_PRESS,
} from '../ContractBox/ContractBox.constants';
import { CONTRACT_BOX_NO_PET_NAME_TEST_ID } from './ContractBoxBase.constants';
import { ContractBoxBaseProps } from './ContractBoxBase.types';

describe('Component ContractBoxBase', () => {
  let props: ContractBoxBaseProps;

  beforeEach(() => {
    props = {
      contractAddress: TEST_ADDRESS,
      contractPetName: CONTRACT_PET_NAME,
      contractLocalImage: CONTRACT_LOCAL_IMAGE,
      onCopyAddress: CONTRACT_COPY_ADDRESS,
      onContractPress: CONTRACT_ON_PRESS,
    };
  });

  const renderComponent = () => render(<ContractBoxBase {...props} />);

  it('should render correctly', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly when contract petname is not provided', () => {
    props.contractPetName = undefined;
    const { getByTestId } = renderComponent();
    const contractPetName = getByTestId(CONTRACT_BOX_NO_PET_NAME_TEST_ID);
    expect(contractPetName).toBeTruthy();
  });
});
