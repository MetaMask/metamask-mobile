import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import QuoteInfoModal from './QuoteInfoModal';

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

const initialMetrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderQuoteInfoModal = () =>
  renderWithProvider(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <QuoteInfoModal />
    </SafeAreaProvider>,
  );

describe('QuoteInfoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderQuoteInfoModal();
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays the correct title and content', () => {
    const { getByText } = renderQuoteInfoModal();

    expect(getByText(strings('bridge.quote_info_title'))).toBeDefined();
    expect(getByText(strings('bridge.quote_info_content'))).toBeDefined();
  });

  it('closes modal when footer button is pressed', () => {
    const { getByText } = renderQuoteInfoModal();

    const closeButton = getByText(strings('bridge.see_other_quotes'));
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
  });
});
