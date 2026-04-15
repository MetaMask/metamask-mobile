import React from 'react';
import { screen } from '@testing-library/react-native';
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
import renderWithProvider from '../../../../util/test/renderWithProvider';

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

  const renderComponent = () =>
    renderWithProvider(<ContractBoxBase {...props} />, {
      state: {
        engine: {
          backgroundState: {
            PreferencesController: { isIpfsGatewayEnabled: true },
          },
        },
      },
    });

  it('should render correctly', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the no-pet-name element when contractPetName is undefined', () => {
    props.contractPetName = undefined;
    renderComponent();
    expect(screen.getByTestId(CONTRACT_BOX_NO_PET_NAME_TEST_ID)).toBeTruthy();
  });
});
