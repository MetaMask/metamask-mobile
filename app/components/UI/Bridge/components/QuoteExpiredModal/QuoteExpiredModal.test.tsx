import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import QuoteExpiredModal from './QuoteExpiredModal';
import Engine from '../../../../../core/Engine';
import { fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockUpdateQuoteParams = jest.fn();

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

jest.mock('../../hooks/useBridgeQuoteRequest', () => ({
  useBridgeQuoteRequest: () => mockUpdateQuoteParams,
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderQuoteExpiredModal = () =>
  renderWithProvider(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <QuoteExpiredModal />
    </SafeAreaProvider>,
  );

describe('QuoteExpiredModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock BridgeController with minimal required properties
    Engine.context.BridgeController = {
      resetState: jest.fn(),
    } as unknown as typeof Engine.context.BridgeController;
  });

  it('renders correctly', () => {
    const { toJSON } = renderQuoteExpiredModal();
    expect(toJSON()).toMatchSnapshot();
  });

  it('resets BridgeController state, updates quote params, and closes modal when get new quote button is pressed', () => {
    const { getByTestId } = renderQuoteExpiredModal();
    const getNewQuoteButton = getByTestId('bottomsheetfooter-button');
    fireEvent.press(getNewQuoteButton);

    expect(Engine.context.BridgeController.resetState).toHaveBeenCalled();
    expect(mockUpdateQuoteParams).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles missing BridgeController gracefully', () => {
    // Remove BridgeController mock
    Engine.context.BridgeController =
      undefined as unknown as typeof Engine.context.BridgeController;

    const { getByTestId } = renderQuoteExpiredModal();
    const getNewQuoteButton = getByTestId('bottomsheetfooter-button');
    fireEvent.press(getNewQuoteButton);

    expect(mockUpdateQuoteParams).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });
});
