import React from 'react';
import { Provider } from 'react-redux';
import { act, render, waitFor } from '@testing-library/react-native';
import TransactionNotification from './index';
import configureStore from '../../../../util/test/configureStore';
import { backgroundState } from '../../../../util/test/initial-root-state';

jest.mock('../../TransactionElement/utils', () => ({
  __esModule: true,
  default: jest.fn(() =>
    Promise.resolve([
      { notificationKey: 'notification-key', actionKey: 'action-key' },
      {},
    ]),
  ),
}));

jest.mock(
  '../../../../component-library/components-temp/BaseNotification',
  () => {
    const ReactMock = require('react');
    const { View } = require('react-native');

    return function MockBaseNotification(props) {
      return ReactMock.createElement(View, {
        testID: 'base-notification',
        ...props,
      });
    };
  },
);

const TRANSACTION_ID = 'tx-1';
const TRANSACTION_HASH = '0xabc';

const createState = ({ status, smartTransactions = [] } = {}) => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      TransactionController: {
        ...backgroundState.TransactionController,
        transactions: [
          {
            id: TRANSACTION_ID,
            hash: TRANSACTION_HASH,
            status,
            chainId: '0x1',
            txParams: { gasPrice: '0x1' },
          },
        ],
      },
      SmartTransactionsController: {
        ...backgroundState.SmartTransactionsController,
        smartTransactionsState: {
          ...backgroundState.SmartTransactionsController.smartTransactionsState,
          smartTransactions: {
            '0x1': smartTransactions,
          },
        },
      },
    },
  },
});

const baseProps = {
  currentNotification: {
    status: 'submitted',
    transaction: { id: TRANSACTION_ID },
  },
  onClose: jest.fn(),
  onDismissComplete: jest.fn(),
  dismissDuration: 4000,
  animatedTimingStart: jest.fn(),
};

describe('TransactionNotification', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('invokes onDismissComplete and renders nothing for submitted smart transactions', async () => {
    const onDismissComplete = jest.fn();
    const store = configureStore(
      createState({
        status: 'submitted',
        smartTransactions: [{ txHash: TRANSACTION_HASH }],
      }),
    );

    const { queryByTestId } = render(
      <Provider store={store}>
        <TransactionNotification
          {...baseProps}
          onDismissComplete={onDismissComplete}
        />
      </Provider>,
    );

    await waitFor(() => {
      expect(onDismissComplete).toHaveBeenCalledTimes(1);
    });

    expect(queryByTestId('base-notification')).toBeNull();
  });

  it('passes dismiss props to BaseNotification for standard transactions', async () => {
    const onDismissComplete = jest.fn();
    const store = configureStore(createState({ status: 'confirmed' }));

    const { getByTestId } = render(
      <Provider store={store}>
        <TransactionNotification
          {...baseProps}
          onDismissComplete={onDismissComplete}
        />
      </Provider>,
    );

    await waitFor(() => {
      expect(getByTestId('base-notification')).toBeOnTheScreen();
    });

    const notification = getByTestId('base-notification');

    expect(notification.props.onDismissComplete).toBe(onDismissComplete);
    expect(notification.props.dismissDuration).toBe(4000);
  });
});
