import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import PredictMarketUnavailableModal from './PredictMarketUnavailableModal';
import { PREDICT_MARKET_UNAVAILABLE_TEST_IDS } from './PredictMarketUnavailableModal.testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

describe('PredictMarketUnavailableModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the market unavailable copy', () => {
    const { getByTestId } = render(<PredictMarketUnavailableModal />);

    expect(
      getByTestId(PREDICT_MARKET_UNAVAILABLE_TEST_IDS.TITLE),
    ).toHaveTextContent(strings('predict.market_unavailable.title'));
    expect(
      getByTestId(PREDICT_MARKET_UNAVAILABLE_TEST_IDS.DESCRIPTION),
    ).toHaveTextContent(strings('predict.market_unavailable.description'));
    expect(
      getByTestId(PREDICT_MARKET_UNAVAILABLE_TEST_IDS.GOT_IT_BUTTON),
    ).toHaveTextContent(strings('predict.market_unavailable.button'));
  });

  it('navigates back when Got it is pressed', async () => {
    const { getByTestId } = render(<PredictMarketUnavailableModal />);

    fireEvent.press(
      getByTestId(PREDICT_MARKET_UNAVAILABLE_TEST_IDS.GOT_IT_BUTTON),
    );

    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
  });

  it('navigates back when the close button is pressed', async () => {
    const { getByTestId } = render(<PredictMarketUnavailableModal />);

    fireEvent.press(
      getByTestId(PREDICT_MARKET_UNAVAILABLE_TEST_IDS.CLOSE_BUTTON),
    );

    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
  });
});
