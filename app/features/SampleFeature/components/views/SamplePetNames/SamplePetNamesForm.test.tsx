import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { SamplePetNamesForm } from './SamplePetNamesForm';
import Engine from '../../../../../core/Engine';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AddressBookController: {
      set: jest.fn(),
    },
  },
}));

describe('SamplePetNamesForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', async () => {
    const { toJSON } = renderWithProvider(
      <SamplePetNamesForm
        chainId={'0x1'}
        initialAddress={'0xc6893a7d6a966535F7884A4de710111986ebB132'}
        initialName={'Test Account'}
      />,
      { state: initialRootState },
    );

    await waitFor(() => {
      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('call AddressBookController.set when saving pet name', async () => {
    const mockSet = Engine.context.AddressBookController.set as jest.Mock;

    const { getByTestId } = renderWithProvider(
      <SamplePetNamesForm
        chainId={'0x1'}
        initialAddress={'0xc6893a7d6a966535F7884A4de710111986ebB132'}
        initialName={'Test Account'}
      />,
      { state: initialRootState },
    );

    const button = getByTestId('add-pet-name-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith(
        '0xc6893a7d6a966535F7884A4de710111986ebB132',
        'Test Account',
        '0x1',
      );
    });
  });
});
