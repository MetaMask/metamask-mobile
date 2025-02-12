import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import EarnTokenSelector from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MOCK_USDC_MAINNET_ASSET } from '../../__mocks__/mockData';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('EarnTokenSelector', () => {
  const mockProps = {
    token: MOCK_USDC_MAINNET_ASSET,
    apr: '4.5%',
    balance: '10,100.00',
  };

  const mockInitialState = {
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <EarnTokenSelector {...mockProps} />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays token symbol and APR', () => {
    const { getByText } = renderWithProvider(
      <EarnTokenSelector {...mockProps} />,
      { state: mockInitialState },
    );
    expect(getByText('4.5% APR')).toBeDefined();
    expect(getByText('10,100.00 USDC')).toBeDefined();
  });

  it('navigates to earn token list when pressed', () => {
    const { getByTestId } = renderWithProvider(
      <EarnTokenSelector {...mockProps} />,
      { state: mockInitialState },
    );
    const button = getByTestId('earn-token-selector');
    fireEvent.press(button);
    expect(mockNavigate).toHaveBeenCalledWith('StakeModals', {
      screen: 'EarnTokenList',
    });
  });

  it('renders without balance when not provided', () => {
    const propsWithoutBalance = {
      ...mockProps,
      balance: undefined,
    };
    const { queryByText } = renderWithProvider(
      <EarnTokenSelector {...propsWithoutBalance} />,
      { state: mockInitialState },
    );
    expect(queryByText('10,100.00 USDC')).toBeNull();
  });
});
