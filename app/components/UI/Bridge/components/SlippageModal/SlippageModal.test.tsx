import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider, Metrics } from 'react-native-safe-area-context';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import SlippageModal from './index';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: jest.fn(() => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    })),
  };
});

const props = {
  route: {
    params: {
      selectedSlippage: '0.5',
      onSelectSlippage: jest.fn(),
    },
  },
};

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderSlippageModal = () =>
  renderWithProvider(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <SlippageModal {...props} />
    </SafeAreaProvider>,
  );

describe('SlippageModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all UI elements with the proper slippage options and apply button', () => {
    const { toJSON, getByText } = renderSlippageModal();

    expect(getByText(strings('bridge.slippage'))).toBeDefined();
    expect(getByText(strings('bridge.slippage_info'))).toBeDefined();
    expect(getByText('0.5%')).toBeDefined();
    expect(getByText('1%')).toBeDefined();
    expect(getByText('3%')).toBeDefined();
    expect(getByText('10%')).toBeDefined();
    expect(getByText(strings('bridge.apply'))).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });

  it('updates slippage value when segment is selected and sends value back when applied', () => {
    const { getByText, getByTestId } = renderSlippageModal();

    // Click on the 3% option
    const option3Percent = getByTestId('slippage-option-3');
    fireEvent.press(option3Percent);

    // Click on the apply button
    const applyButton = getByText(strings('bridge.apply'));
    fireEvent.press(applyButton);

    // Check if the callback was called with the correct value
    expect(props.route.params.onSelectSlippage).toHaveBeenCalledWith('3');
    // Check that navigation.goBack was called
    expect(mockGoBack).toHaveBeenCalled();
  });
});
