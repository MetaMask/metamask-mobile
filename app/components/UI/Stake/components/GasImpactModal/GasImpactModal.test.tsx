import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { GasImpactModalProps } from './GasImpactModal.types';
import GasImpactModal from './index';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

const props: GasImpactModalProps = {
  route: {
    key: '1',
    params: {
      amountWei: '3210000000000000',
      amountFiat: '7.46',
      annualRewardRate: '2.5%',
      annualRewardsETH: '2.5 ETH',
      annualRewardsFiat: '$5000',
    },
    name: 'params',
  },
};

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderGasImpactModal = () =>
  renderWithProvider(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <GasImpactModal {...props} />,
    </SafeAreaProvider>,
  );

describe('GasImpactModal', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderGasImpactModal();

    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to StakeConfirmationView on approval', () => {
    const { getByText } = renderGasImpactModal();

    const proceedAnywayButton = getByText(strings('stake.proceed_anyway'));

    fireEvent.press(proceedAnywayButton);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('closes gas impact modal on cancel', () => {
    const { getByText } = renderGasImpactModal();

    const proceedAnywayButton = getByText(strings('stake.cancel'));

    fireEvent.press(proceedAnywayButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
