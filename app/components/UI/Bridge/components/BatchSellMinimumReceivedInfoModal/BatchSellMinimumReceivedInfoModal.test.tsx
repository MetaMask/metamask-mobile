import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { strings } from '../../../../../../locales/i18n';
import { BatchSellMinimumReceivedInfoModal } from './index';
import { BatchSellMinimumReceivedInfoModalSelectorsIDs } from './BatchSellMinimumReceivedInfoModal.testIds';
import { BatchSellMinimumReceivedInfoModalParams } from './BatchSellMinimumReceivedInfoModal.types';

const mockGoBack = jest.fn();
const mockReplace = jest.fn();
let mockRouteParams: BatchSellMinimumReceivedInfoModalParams;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    replace: mockReplace,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockRouteParams,
}));

function renderModal(params: BatchSellMinimumReceivedInfoModalParams = {}) {
  mockRouteParams = params;

  return render(<BatchSellMinimumReceivedInfoModal />);
}

describe('BatchSellMinimumReceivedInfoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
  });

  it('renders the minimum received information', () => {
    const { getByTestId, getByText } = renderModal();

    expect(
      getByTestId(BatchSellMinimumReceivedInfoModalSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.minimum_received_tooltip_title')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellMinimumReceivedInfoModalSelectorsIDs.DESCRIPTION),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.minimum_received_tooltip_content')),
    ).toBeOnTheScreen();
  });

  it('closes with navigation when the close button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(BatchSellMinimumReceivedInfoModalSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('restores the source modal when the back button is pressed', () => {
    const sourceModal = {
      screen: 'BatchSellQuoteDetailsModal',
      params: {
        totalReceived: '100 USDC',
      },
    };
    const { getByTestId } = renderModal({ sourceModal });

    fireEvent.press(
      getByTestId(BatchSellMinimumReceivedInfoModalSelectorsIDs.BACK_BUTTON),
    );

    expect(mockReplace).toHaveBeenCalledWith(
      sourceModal.screen,
      sourceModal.params,
    );
  });

  it('does not render a back button without a source modal', () => {
    const { queryByTestId } = renderModal();

    expect(
      queryByTestId(BatchSellMinimumReceivedInfoModalSelectorsIDs.BACK_BUTTON),
    ).toBeNull();
  });
});
