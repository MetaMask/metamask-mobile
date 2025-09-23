import { initialState } from '../../_mocks_/initialState';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider, Metrics } from 'react-native-safe-area-context';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import SlippageModal from './index';
import { setSlippage } from '../../../../../core/redux/slices/bridge';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();

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

jest.mock('react-redux', () => {
  const actualReactRedux = jest.requireActual('react-redux');
  return {
    ...actualReactRedux,
    useDispatch: () => mockDispatch,
  };
});

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderSlippageModal = () =>
  renderWithProvider(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <SlippageModal />
    </SafeAreaProvider>,
    {
      state: initialState,
    },
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
    expect(getByText('2%')).toBeDefined();
    expect(getByText('5%')).toBeDefined();
    expect(getByText(strings('bridge.apply'))).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });

  it('updates slippage value when segment is selected and dispatches action when applied', () => {
    const { getByText, getByTestId } = renderSlippageModal();

    // Click on the 3% option
    const option2Percent = getByTestId('slippage-option-2');
    fireEvent.press(option2Percent);

    // Click on the apply button
    const applyButton = getByText(strings('bridge.apply'));
    fireEvent.press(applyButton);

    // Check if the action was dispatched with the correct value
    expect(mockDispatch).toHaveBeenCalledWith(setSlippage('2'));

    // Check that navigation.goBack was called
    expect(mockGoBack).toHaveBeenCalled();
  });
});
