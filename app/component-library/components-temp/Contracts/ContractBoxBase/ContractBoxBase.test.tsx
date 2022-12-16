import React from 'react';
import { shallow } from 'enzyme';
import ContractBoxBase from './ContractBoxBase';
import {
  CONTRACT_ADDRESS,
  CONTRACT_PET_NAME,
  CONTRACT_LOCAL_IMAGE,
} from '../ContractBox/ContractBox.constants';
import { CONTRACT_BOX_NO_PET_NAME_TEST_ID } from './ContractBoxBase.constants';
import { ContractBoxBaseProps } from './ContractBoxBase.types';

describe('Component ContractBoxBase', () => {
  let props: ContractBoxBaseProps;

  beforeEach(() => {
    props = {
      contractAddress: CONTRACT_ADDRESS,
      contractPetName: CONTRACT_PET_NAME,
      contractLocalImage: CONTRACT_LOCAL_IMAGE,
    };
  });

  const renderComponent = () => shallow(<ContractBoxBase {...props} />);

  it('should render correctly', () => {
    const component = renderComponent();
    expect(component).toMatchSnapshot();
  });

  it('should render correctly when contract petname is not provided', () => {
    props.contractPetName = undefined;
    const component = renderComponent();
    const contractPetName = component.findWhere(
      (node) => node.prop('testID') === CONTRACT_BOX_NO_PET_NAME_TEST_ID,
    );
    expect(contractPetName.exists()).toBe(true);
  });
});
