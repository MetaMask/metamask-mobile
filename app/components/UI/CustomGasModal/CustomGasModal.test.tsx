import React from 'react';

import { fireEvent } from '@testing-library/react-native';

import Engine from '../../../core/Engine';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import renderWithProvider from '../../../util/test/renderWithProvider';
import CustomGasModal from './';

Engine.init({});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigation: {},
  }),
  createNavigatorFactory: () => ({}),
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const KeyboardAwareScrollView = jest.requireActual('react-native').ScrollView;
  return { KeyboardAwareScrollView };
});

const gasSelected = 'high';

const mockInitialState = {
  settings: {},
  transaction: {
    selectedAsset: {},
    transaction: {
      gas: '0x0',
      gasPrice: '0x0',
      data: '0x0',
    },
  },
  engine: {
    backgroundState: {
      ...initialBackgroundState,
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: any) => fn(mockInitialState),
}));

const mockedAction = jest.fn();
const updateGasState = jest.fn();
const eip1559GasData = {
  maxFeePerGas: '0x0',
  maxPriorityFeePerGas: '0x1',
  suggestedMaxFeePerGas: '0x2',
  suggestedMaxPriorityFeePerGas: '0x3',
  suggestedGasLimit: '0x4',
};
const eip1559GasTxn = {
  suggestedGasLimit: '0x5',
  totalMaxHex: '0x6',
};

const legacyGasData = {
  legacyGasLimit: '',
  suggestedGasPrice: '',
};

const customGasModalSharedProps = {
  gasSelected,
  onChange: mockedAction,
  onCancel: mockedAction,
  isAnimating: false,
  onlyGas: false,
  validateAmount: mockedAction,
  updateGasState,
  onGasChanged: (gas: string) => mockedAction(gas),
  onGasCanceled: (gas: string) => mockedAction(gas),
};

describe('CustomGasModal', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(
      <CustomGasModal
        {...customGasModalSharedProps}
        legacy
        legacyGasData={legacyGasData}
      />,
      { state: mockInitialState },
      false,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should contain gas price if legacy', async () => {
    const { findByText } = renderWithProvider(
      <CustomGasModal
        {...customGasModalSharedProps}
        legacy
        legacyGasData={legacyGasData}
      />,
      { state: mockInitialState },
      false,
    );

    expect(await findByText('Gas price')).toBeDefined();
    expect(await findByText('Gas limit must be at least 21000')).toBeDefined();
  });

  it('should contain gas fee if EIP1559 if legacy is false', () => {
    const { queryByText } = renderWithProvider(
      <CustomGasModal
        {...customGasModalSharedProps}
        legacy={false}
        EIP1559GasData={eip1559GasData}
        EIP1559GasTxn={eip1559GasTxn}
      />,
      { state: mockInitialState },
      false,
    );

    expect(queryByText('Max fee')).toBeDefined();
  });

  it('should call updateParentState when saved', () => {
    const { getByText } = renderWithProvider(
      <CustomGasModal
        {...customGasModalSharedProps}
        validateAmount={mockedAction}
        updateGasState={updateGasState}
        legacy
        legacyGasData={legacyGasData}
      />,
      { state: mockInitialState },
      false,
    );

    const saveButton = getByText('Save');

    fireEvent.press(saveButton);
    expect(updateGasState).toHaveBeenCalled();
  });
});
