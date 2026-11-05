import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { LIMIT_ORDER_NEW_BANNER_DISMISSED } from '../../../../../constants/storage';
import { BridgeTabKey } from '../../Views/BridgeView/BridgeView.constants';
import {
  LimitOrderNewBanner,
  LIMIT_ORDER_NEW_BANNER_TEST_ID,
  LIMIT_ORDER_NEW_BANNER_DISMISS_TEST_ID,
} from './LimitOrderNewBanner';

jest.mock('../../../../../store/storage-wrapper', () => ({
  getItemSync: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

let mockIsLimitOrderTabEnabled = true;
jest.mock('../../../../../selectors/bridge/featureFlags', () => ({
  selectBridgeLimitOrderTabEnabledFlag: () => mockIsLimitOrderTabEnabled,
}));

const mockSetSelectedTab = jest.fn();
const mockSetRenderedTab = jest.fn();
jest.mock('../../hooks/useBridgeSession', () => ({
  useBridgeSession: () => ({
    setSelectedTab: mockSetSelectedTab,
    setRenderedTab: mockSetRenderedTab,
  }),
}));

const mockGetItemSync = jest.mocked(StorageWrapper.getItemSync);
const mockSetItem = jest.mocked(StorageWrapper.setItem);

const renderBanner = (isLimitOrderTabEnabled = true) => {
  mockIsLimitOrderTabEnabled = isLimitOrderTabEnabled;
  return renderWithProvider(<LimitOrderNewBanner />);
};

describe('LimitOrderNewBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemSync.mockReturnValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it('renders the title and description copy', () => {
    const { getByText } = renderBanner();

    expect(getByText('bridge.limit_order_new_banner_title')).toBeOnTheScreen();
    expect(
      getByText('bridge.limit_order_new_banner_description'),
    ).toBeOnTheScreen();
  });

  it('switches to the Limit tab when the banner is pressed', () => {
    const { getByTestId } = renderBanner();

    fireEvent.press(getByTestId(LIMIT_ORDER_NEW_BANNER_TEST_ID));

    expect(mockSetSelectedTab).toHaveBeenCalledWith(BridgeTabKey.Limit);
    expect(mockSetRenderedTab).toHaveBeenCalledWith(BridgeTabKey.Limit);
  });

  it('persists the dismissal and hides the banner when closed', () => {
    const { getByTestId, queryByTestId } = renderBanner();

    fireEvent.press(getByTestId(LIMIT_ORDER_NEW_BANNER_DISMISS_TEST_ID));

    expect(mockSetItem).toHaveBeenCalledWith(
      LIMIT_ORDER_NEW_BANNER_DISMISSED,
      'true',
    );
    expect(queryByTestId(LIMIT_ORDER_NEW_BANNER_TEST_ID)).not.toBeOnTheScreen();
  });

  it('stays dismissed when persisting the dismissal rejects', async () => {
    mockSetItem.mockRejectedValue(new Error('storage unavailable'));
    const { getByTestId, queryByTestId } = renderBanner();

    await act(async () => {
      fireEvent.press(getByTestId(LIMIT_ORDER_NEW_BANNER_DISMISS_TEST_ID));
    });

    expect(queryByTestId(LIMIT_ORDER_NEW_BANNER_TEST_ID)).not.toBeOnTheScreen();
  });

  it('renders nothing when the banner was already dismissed', () => {
    mockGetItemSync.mockReturnValue('true');

    const { queryByTestId } = renderBanner();

    expect(mockGetItemSync).toHaveBeenCalledWith(
      LIMIT_ORDER_NEW_BANNER_DISMISSED,
    );
    expect(queryByTestId(LIMIT_ORDER_NEW_BANNER_TEST_ID)).not.toBeOnTheScreen();
  });

  it('renders nothing when the Limit tab is disabled', () => {
    const { queryByTestId } = renderBanner(false);

    expect(queryByTestId(LIMIT_ORDER_NEW_BANNER_TEST_ID)).not.toBeOnTheScreen();
  });
});
