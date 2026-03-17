import React from 'react';
import { screen } from '@testing-library/react-native';
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
import renderWithProvider from '../../../../util/test/renderWithProvider';

describe('ContractBox', () => {
  it('should render ContractBox', () => {
    renderWithProvider(
      <ContractBox
        contractAddress={TEST_ADDRESS}
        contractPetName={CONTRACT_PET_NAME}
        contractLocalImage={CONTRACT_LOCAL_IMAGE}
        onCopyAddress={CONTRACT_COPY_ADDRESS}
        onExportAddress={CONTRACT_EXPORT_ADDRESS}
        onContractPress={CONTRACT_ON_PRESS}
      />,
      {
        state: {
          engine: {
            backgroundState: {
              PreferencesController: { isIpfsGatewayEnabled: true },
            },
          },
        },
      },
    );
    expect(screen.getAllByTestId(CONTRACT_BOX_TEST_ID).length).toBeGreaterThan(0);
  });
});
