import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import type { ActivityListItem } from '../../../util/activity-adapters';
import ActivityDetails from './ActivityDetails';
import { ActivityDetailsSelectorsIDs } from './ActivityDetails.testIds';
import { useActivityDetailsItem } from './hooks/useActivityDetailsItem';
import { useParams } from '../../../util/navigation/navUtils';
// eslint-disable-next-line import-x/no-restricted-paths -- test asserts the activity-list store hand-off
import { getPreloadedActivityItem } from '../ActivityList/preloadedActivityItemStore';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('./hooks/useActivityDetailsItem', () => ({
  useActivityDetailsItem: jest.fn(),
}));

// Focus on screen behaviour; the template dispatch is covered separately.
jest.mock('./templates/TemplateLoader', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    TemplateLoader: () =>
      ReactActual.createElement(View, { testID: 'mock-template-loader' }),
  };
});

jest.mock('../ActivityList/preloadedActivityItemStore', () => ({
  getPreloadedActivityItem: jest.fn(),
  stashPreloadedActivityItem: jest.fn(),
}));

// Speed-up / cancel pull in the hardware-wallet + navigation chain; the screen
// test only needs the wiring to mount. Behaviour is covered in the hook + banner
// tests.
jest.mock('../ActivityList/useUnifiedTxActions', () => ({
  useUnifiedTxActions: () => ({
    speedUpIsOpen: false,
    cancelIsOpen: false,
    confirmDisabled: false,
    existingTx: null,
    isLedgerAccount: false,
    isQRHardwareAccount: false,
    onSpeedUpAction: jest.fn(),
    onCancelAction: jest.fn(),
    onSpeedUpCancelCompleted: jest.fn(),
    speedUpTransaction: jest.fn(),
    cancelTransaction: jest.fn(),
    signQRTransaction: jest.fn(),
    signLedgerTransaction: jest.fn(),
    cancelUnsignedQRTransaction: jest.fn(),
  }),
}));

jest.mock('../confirmations/components/modals/cancel-speedup-modal', () => ({
  CancelSpeedupModal: () => null,
}));

const useParamsMock = jest.mocked(useParams);
const useActivityDetailsItemMock = jest.mocked(useActivityDetailsItem);
const getPreloadedActivityItemMock = jest.mocked(getPreloadedActivityItem);

const sendItem: ActivityListItem = {
  type: 'send',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xhash',
  data: { from: '0xfrom', to: '0xto' },
} as ActivityListItem;

describe('ActivityDetails screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useParamsMock.mockReturnValue({
      chainId: 'eip155:1',
      txIdentifier: '0xhash',
    });
  });

  it('renders the template when the transaction resolves', () => {
    useActivityDetailsItemMock.mockReturnValue(sendItem);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetails />,
    );

    expect(getByTestId(ActivityDetailsSelectorsIDs.SCREEN)).toBeOnTheScreen();
    expect(getByTestId('mock-template-loader')).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.NOT_FOUND)).toBeNull();
  });

  it('renders a not-found message when the transaction cannot be resolved', () => {
    useActivityDetailsItemMock.mockReturnValue(undefined);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetails />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.NOT_FOUND),
    ).toBeOnTheScreen();
    expect(queryByTestId('mock-template-loader')).toBeNull();
  });

  it('captures the preloaded row once and reuses it across re-renders', () => {
    const perpsItem = {
      ...sendItem,
      type: 'perpsOpenLong',
    } as ActivityListItem;
    getPreloadedActivityItemMock.mockReturnValue(perpsItem);
    useParamsMock.mockReturnValue({
      chainId: 'eip155:1',
      txIdentifier: '0xhash',
      preloadKey: 'k1',
    });
    // Echo the preloaded arg back so a blanked capture would surface as
    // "not found" instead of the template.
    useActivityDetailsItemMock.mockImplementation(
      (_id, _chain, preloaded) => preloaded,
    );

    const { rerender, getByTestId } = renderWithProvider(<ActivityDetails />);
    rerender(<ActivityDetails />);

    // Store is read once (on mount, keyed by preloadKey), then held in the ref —
    // a later eviction can't blank the still-mounted screen.
    expect(getPreloadedActivityItemMock).toHaveBeenCalledTimes(1);
    expect(getPreloadedActivityItemMock).toHaveBeenCalledWith('k1');
    expect(useActivityDetailsItemMock.mock.calls.at(-1)?.[2]).toBe(perpsItem);
    expect(getByTestId('mock-template-loader')).toBeOnTheScreen();
  });
});
