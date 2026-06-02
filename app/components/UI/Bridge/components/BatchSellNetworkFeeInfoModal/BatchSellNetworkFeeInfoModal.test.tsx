import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { strings } from '../../../../../../locales/i18n';
import { BatchSellNetworkFeeInfoModal } from './index';
import { BatchSellNetworkFeeInfoModalSelectorsIDs } from './BatchSellNetworkFeeInfoModal.testIds';
import { BatchSellNetworkFeeInfoModalParams } from './BatchSellNetworkFeeInfoModal.types';

const mockGoBack = jest.fn();
const mockReplace = jest.fn();
let mockRouteParams: BatchSellNetworkFeeInfoModalParams;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    replace: mockReplace,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockRouteParams,
}));

function renderModal(params: BatchSellNetworkFeeInfoModalParams = {}) {
  mockRouteParams = params;

  return render(<BatchSellNetworkFeeInfoModal />);
}

describe('BatchSellNetworkFeeInfoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
  });

  it('renders the network fee information', () => {
    const { getByTestId, getByText } = renderModal();

    expect(
      getByTestId(BatchSellNetworkFeeInfoModalSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.network_fee_info_title')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellNetworkFeeInfoModalSelectorsIDs.DESCRIPTION),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.network_fee_info_content')),
    ).toBeOnTheScreen();
  });

  it('closes with navigation when the close button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(BatchSellNetworkFeeInfoModalSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('restores the source modal when the back button is pressed', () => {
    const sourceModal = {
      screen: 'BatchSellFinalReviewModal',
      params: {
        networkFee: '1.20 USDC',
      },
    };
    const { getByTestId } = renderModal({ sourceModal });

    fireEvent.press(
      getByTestId(BatchSellNetworkFeeInfoModalSelectorsIDs.BACK_BUTTON),
    );

    expect(mockReplace).toHaveBeenCalledWith(
      sourceModal.screen,
      sourceModal.params,
    );
  });

  it('does not render a back button without a source modal', () => {
    const { queryByTestId } = renderModal();

    expect(
      queryByTestId(BatchSellNetworkFeeInfoModalSelectorsIDs.BACK_BUTTON),
    ).toBeNull();
  });
});
