import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { strings } from '../../../../../../locales/i18n';
import { BatchSellMinimumReceivedInfoModal } from './index';
import { BatchSellMinimumReceivedInfoModalSelectorsIDs } from './BatchSellMinimumReceivedInfoModal.testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

describe('BatchSellMinimumReceivedInfoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the minimum received information', () => {
    const { getByTestId, getByText } = render(
      <BatchSellMinimumReceivedInfoModal />,
    );

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
    const { getByTestId } = render(<BatchSellMinimumReceivedInfoModal />);

    fireEvent.press(
      getByTestId(BatchSellMinimumReceivedInfoModalSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
