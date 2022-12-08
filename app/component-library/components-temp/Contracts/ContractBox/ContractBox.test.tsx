import React from 'react';
import { shallow } from 'enzyme';
import { ContractBoxProps } from './ContractBox.types';
import ContractBox from './ContractBox';
import {
  CONTRACT_BOX_TEST_ID,
  CONTRACT_ADDRESS,
  CONTRACT_PET_NAME,
  CONTRACT_LOCAL_IMAGE,
  CONTRACT_COPY_ADDRESS,
  CONTRACT_EXPORT_ADDRESS,
  CONTRACT_ON_PRESS,
} from './ContractBox.constants';

describe('ContractBox', () => {
  it('should render ContractBox', () => {
    const wrapper = shallow<ContractBoxProps>(
      <ContractBox
        contractAddress={CONTRACT_ADDRESS}
        contractPetName={CONTRACT_PET_NAME}
        contractLocalImage={CONTRACT_LOCAL_IMAGE}
        onCopyAddress={CONTRACT_COPY_ADDRESS}
        onExportAddress={CONTRACT_EXPORT_ADDRESS}
        onContractPress={CONTRACT_ON_PRESS}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CONTRACT_BOX_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
