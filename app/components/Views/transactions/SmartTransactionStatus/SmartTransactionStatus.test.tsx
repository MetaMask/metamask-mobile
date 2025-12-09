import React from 'react';
import SmartTransactionStatus, {
  FALLBACK_STX_ESTIMATED_DEADLINE_SEC,
  showRemainingTimeInMinAndSec,
} from './SmartTransactionStatus';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { fireEvent } from '@testing-library/react-native';
import { SmartTransactionStatuses } from '@metamask/smart-transactions-controller';
import { merge } from 'lodash';

const initialState = {
  engine: {
    backgroundState,
  },
};

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const PENDING_APPROVALS = {
  Dapp: {
    pending: {
      id: '8pJ0jVaREyCysgt8DeHcO',
      origin: 'pancakeswap.finance',
      type: 'smart_transaction_status',
      time: 1711401024472,
      requestData: null,
      requestState: {
        smartTransaction: { status: 'pending', creationTime: 1711401024472 },
        isDapp: true,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
      },
      expectsResult: false,
    },
    success: {
      id: '8pJ0jVaREyCysgt8DeHcO',
      origin: 'pancakeswap.finance',
      type: 'smart_transaction_status',
      time: 1711401024472,
      requestData: null,
      requestState: {
        smartTransaction: {
          statusMetadata: {
            cancellationFeeWei: 0,
            cancellationReason: 'not_cancelled',
            deadlineRatio: 0,
            isSettled: true,
            minedTx: 'success',
            wouldRevertMessage: null,
            minedHash:
              '0x36b10b5000b3a0babfaf205742e7c04076d4289863d43a3e44ef559fb31bfa37',
            type: 'sentinel',
          },
          status: 'success',
          cancellable: false,
          uuid: '18fa4b26-eaec-11ee-b819-aa13775ea356',
        },
        isDapp: true,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
      },
      expectsResult: false,
    },
    cancelled: {
      id: '8pJ0jVaREyCysgt8DeHcO',
      origin: 'pancakeswap.finance',
      type: 'smart_transaction_status',
      time: 1711401024472,
      requestData: null,
      requestState: {
        smartTransaction: {
          status: SmartTransactionStatuses.CANCELLED,
          creationTime: 1711401024472,
        },
        isDapp: true,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
      },
      expectsResult: false,
    },
    unknown: {
      id: '8pJ0jVaREyCysgt8DeHcO',
      origin: 'pancakeswap.finance',
      type: 'smart_transaction_status',
      time: 1711401024472,
      requestData: null,
      requestState: {
        smartTransaction: {
          status: SmartTransactionStatuses.UNKNOWN,
          creationTime: 1711401024472,
        },
        isDapp: true,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
      },
      expectsResult: false,
    },
  },
  Send: {
    pending: {
      id: 'Ws4jw14OTsnPpX30B0hso',
      origin: 'MetaMask Mobile',
      type: 'smart_transaction_status',
      time: 1711395354068,
      requestData: null,
      requestState: {
        smartTransaction: { status: 'pending', creationTime: 1711395354068 },
        isDapp: false,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
      },
      expectsResult: false,
    },
    success: {
      id: 'Ws4jw14OTsnPpX30B0hso',
      origin: 'MetaMask Mobile',
      type: 'smart_transaction_status',
      time: 1711395354068,
      requestData: null,
      requestState: {
        smartTransaction: {
          statusMetadata: {
            cancellationFeeWei: 0,
            cancellationReason: 'not_cancelled',
            deadlineRatio: 0,
            isSettled: true,
            minedTx: 'success',
            wouldRevertMessage: null,
            minedHash:
              '0x1e788766537a84f0979f1a85f3cb8f5ff01c6df4134d9a59c403b3ffef0812ec',
            type: 'sentinel',
          },
          status: 'success',
          cancellable: false,
          uuid: 'e4e20f5b-eade-11ee-b531-c223837ee6b7',
        },
        isDapp: false,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
      },
      expectsResult: false,
    },
    cancelled: {
      id: 'Ws4jw14OTsnPpX30B0hso',
      origin: 'MetaMask Mobile',
      type: 'smart_transaction_status',
      time: 1711395354068,
      requestData: null,
      requestState: {
        smartTransaction: {
          status: SmartTransactionStatuses.CANCELLED,
          creationTime: 1711395354068,
        },
        isDapp: false,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
      },
      expectsResult: false,
    },
    unknown: {
      id: 'Ws4jw14OTsnPpX30B0hso',
      origin: 'MetaMask Mobile',
      type: 'smart_transaction_status',
      time: 1711395354068,
      requestData: null,
      requestState: {
        smartTransaction: {
          status: SmartTransactionStatuses.UNKNOWN,
          creationTime: 1711395354068,
        },
        isDapp: false,
        isInSwapFlow: false,
        isSwapApproveTx: false,
        isSwapTransaction: false,
      },
      expectsResult: false,
    },
  },
  Swap: {
    pending: {
      id: 'UdluGaS-UDJ7G9CIrXrCc',
      origin: 'EXAMPLE_FOX_CODE',
      type: 'smart_transaction_status',
      time: 1711401929050,
      requestData: null,
      requestState: {
        smartTransaction: { status: 'pending', creationTime: 1711401929050 },
        isDapp: false,
        isInSwapFlow: true,
        isSwapApproveTx: false,
        isSwapTransaction: true,
      },
      expectsResult: false,
    },
    success: {
      id: 'UdluGaS-UDJ7G9CIrXrCc',
      origin: 'EXAMPLE_FOX_CODE',
      type: 'smart_transaction_status',
      time: 1711401929050,
      requestData: null,
      requestState: {
        smartTransaction: {
          statusMetadata: {
            cancellationFeeWei: 0,
            cancellationReason: 'not_cancelled',
            deadlineRatio: 0,
            isSettled: true,
            minedTx: 'success',
            wouldRevertMessage: null,
            minedHash:
              '0x3e7e8ade8c1b847f574e6440d2ee0358fba0d5c92c6c29fd7afcf1ea18bc595b',
            type: 'sentinel',
          },
          status: 'success',
          cancellable: false,
          uuid: '343b1e2d-eaee-11ee-86e5-3a4eb35f9cf6',
        },
        isDapp: false,
        isInSwapFlow: true,
        isSwapApproveTx: false,
        isSwapTransaction: true,
      },
      expectsResult: false,
    },
    cancelled: {
      id: 'UdluGaS-UDJ7G9CIrXrCc',
      origin: 'EXAMPLE_FOX_CODE',
      type: 'smart_transaction_status',
      time: 1711401929050,
      requestData: null,
      requestState: {
        smartTransaction: {
          status: SmartTransactionStatuses.CANCELLED,
          creationTime: 1711401929050,
        },
        isDapp: false,
        isInSwapFlow: true,
        isSwapApproveTx: false,
        isSwapTransaction: true,
      },
      expectsResult: false,
    },
    unknown: {
      id: 'UdluGaS-UDJ7G9CIrXrCc',
      origin: 'EXAMPLE_FOX_CODE',
      type: 'smart_transaction_status',
      time: 1711401929050,
      requestData: null,
      requestState: {
        smartTransaction: {
          status: SmartTransactionStatuses.UNKNOWN,
          creationTime: 1711401929050,
        },
        isDapp: false,
        isInSwapFlow: true,
        isSwapApproveTx: false,
        isSwapTransaction: true,
      },
      expectsResult: false,
    },
  },
};

describe('SmartTransactionStatus', () => {
  afterEach(() => {
    mockNavigate.mockReset();
  });

  describe('showRemainingTimeInMinAndSec', () => {
    it('should return "0:00" when input is not an integer', () => {
      expect(showRemainingTimeInMinAndSec(1.5)).toEqual('0:00');
      expect(showRemainingTimeInMinAndSec(NaN)).toEqual('0:00');
    });

    it('should return minutes and seconds when input is an integer', () => {
      expect(showRemainingTimeInMinAndSec(90)).toEqual('1:30');
      expect(showRemainingTimeInMinAndSec(60)).toEqual('1:00');
      expect(showRemainingTimeInMinAndSec(59)).toEqual('0:59');
      expect(showRemainingTimeInMinAndSec(0)).toEqual('0:00');
    });
  });

  describe('Component', () => {
    describe('pending', () => {
      it('should render estimated deadline countdown when STX is being submitted', () => {
        const { getByText } = renderWithProvider(
          <SmartTransactionStatus
            requestState={{
              smartTransaction: {
                ...PENDING_APPROVALS.Send.pending.requestState.smartTransaction,
                creationTime: Date.now(),
                // TODO: Replace "any" with type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any,
              isDapp: PENDING_APPROVALS.Send.pending.requestState.isDapp,
              isInSwapFlow:
                PENDING_APPROVALS.Send.pending.requestState.isInSwapFlow,
            }}
            origin={PENDING_APPROVALS.Send.pending.origin}
            onConfirm={jest.fn()}
          />,
          { state: initialState },
        );

        const header = getByText(
          strings('smart_transactions.status_submitting_header'),
        );
        expect(header).toBeDefined();
      });
      it('should render max deadline countdown when STX past estimated time', () => {
        const { getByText } = renderWithProvider(
          <SmartTransactionStatus
            requestState={{
              smartTransaction: {
                ...PENDING_APPROVALS.Send.pending.requestState.smartTransaction,
                creationTime:
                  Date.now() - (FALLBACK_STX_ESTIMATED_DEADLINE_SEC + 1) * 1000,
                // TODO: Replace "any" with type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any,
              isDapp: PENDING_APPROVALS.Send.pending.requestState.isDapp,
              isInSwapFlow:
                PENDING_APPROVALS.Send.pending.requestState.isInSwapFlow,
            }}
            origin={PENDING_APPROVALS.Send.pending.origin}
            onConfirm={jest.fn()}
          />,
          { state: initialState },
        );

        const header = getByText(
          strings(
            'smart_transactions.status_submitting_past_estimated_deadline_header',
          ),
        );
        expect(header).toBeDefined();
      });
    });

    describe('success', () => {
      it('should render success when STX has success status', () => {
        const { getByText } = renderWithProvider(
          <SmartTransactionStatus
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            requestState={PENDING_APPROVALS.Send.success.requestState as any}
            origin={PENDING_APPROVALS.Send.success.origin}
            onConfirm={jest.fn()}
          />,
          { state: initialState },
        );

        const header = getByText(
          strings('smart_transactions.status_success_header'),
        );
        expect(header).toBeDefined();
      });

      describe('dapp tx', () => {
        it('should navigate to Activity page on press of primary button', () => {
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              // TODO: Replace "any" with type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              requestState={PENDING_APPROVALS.Dapp.success.requestState as any}
              origin={PENDING_APPROVALS.Dapp.success.origin}
              onConfirm={jest.fn()}
            />,
            { state: initialState },
          );

          const primaryButton = getByText(
            strings('smart_transactions.view_activity'),
          );
          fireEvent.press(primaryButton);
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
        it('should close the Status page on press of secondary button', () => {
          const onConfirm = jest.fn();
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              // TODO: Replace "any" with type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              requestState={PENDING_APPROVALS.Dapp.success.requestState as any}
              origin={PENDING_APPROVALS.Dapp.success.origin}
              onConfirm={onConfirm}
            />,
            { state: initialState },
          );

          const secondaryButton = getByText(
            strings('smart_transactions.return_to_dapp', {
              dappName: PENDING_APPROVALS.Dapp.success.origin,
            }),
          );
          fireEvent.press(secondaryButton);
          expect(mockNavigate).not.toHaveBeenCalled();
          expect(onConfirm).toHaveBeenCalled();
        });
      });

      describe('send tx', () => {
        it('should navigate to Send page on press of primary button', () => {
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              // TODO: Replace "any" with type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              requestState={PENDING_APPROVALS.Send.success.requestState as any}
              origin={PENDING_APPROVALS.Send.success.origin}
              onConfirm={jest.fn()}
            />,
            { state: initialState },
          );

          const primaryButton = getByText(
            strings('smart_transactions.create_new', {
              txType: strings('smart_transactions.send'),
            }),
          );
          fireEvent.press(primaryButton);
          expect(mockNavigate).toHaveBeenCalledWith('SendFlowView');
        });
        it('should navigate to Activity page on press of secondary button', () => {
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              // TODO: Replace "any" with type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              requestState={PENDING_APPROVALS.Send.success.requestState as any}
              origin={PENDING_APPROVALS.Send.success.origin}
              onConfirm={jest.fn()}
            />,
            { state: initialState },
          );

          const secondaryButton = getByText(
            strings('smart_transactions.view_activity'),
          );
          fireEvent.press(secondaryButton);
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });

      describe('MM Swaps flow tx', () => {
        it('should navigate to Swaps page on press of primary button', () => {
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              // TODO: Replace "any" with type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              requestState={PENDING_APPROVALS.Swap.success.requestState as any}
              origin={PENDING_APPROVALS.Swap.success.origin}
              onConfirm={jest.fn()}
            />,
            {
              state: merge({}, initialState, {
                engine: {
                  backgroundState: {
                    SmartTransactionsController: {
                      smartTransactionsState: {
                        smartTransactions: {
                          '0x1': [
                            PENDING_APPROVALS.Swap.success.requestState
                              .smartTransaction,
                          ],
                        },
                      },
                    },
                  },
                },
              }),
            },
          );

          const primaryButton = getByText(
            strings('smart_transactions.create_new', {
              txType: strings('smart_transactions.swap'),
            }),
          );
          fireEvent.press(primaryButton);
          expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.ROOT);
        });
        it('should navigate to Activity page on press of secondary button', () => {
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              // TODO: Replace "any" with type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              requestState={PENDING_APPROVALS.Swap.success.requestState as any}
              origin={PENDING_APPROVALS.Swap.success.origin}
              onConfirm={jest.fn()}
            />,
            {
              state: merge({}, initialState, {
                engine: {
                  backgroundState: {
                    SmartTransactionsController: {
                      smartTransactionsState: {
                        smartTransactions: {
                          '0x1': [
                            PENDING_APPROVALS.Swap.success.requestState
                              .smartTransaction,
                          ],
                        },
                      },
                    },
                  },
                },
              }),
            },
          );

          const secondaryButton = getByText(
            strings('smart_transactions.view_activity'),
          );
          fireEvent.press(secondaryButton);
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });
    });

    describe('cancelled', () => {
      it('should render cancelled when STX has cancelled status', () => {
        const { getByText } = renderWithProvider(
          <SmartTransactionStatus
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            requestState={PENDING_APPROVALS.Send.cancelled.requestState as any}
            origin={PENDING_APPROVALS.Send.cancelled.origin}
            onConfirm={jest.fn()}
          />,
          { state: initialState },
        );

        const header = getByText(
          strings('smart_transactions.status_cancelled_header'),
        );
        expect(header).toBeDefined();
      });

      describe('dapp tx', () => {
        it('should close the Status page on press of secondary button', () => {
          const onConfirm = jest.fn();
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              requestState={
                // TODO: Replace "any" with type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                PENDING_APPROVALS.Dapp.cancelled.requestState as any
              }
              origin={PENDING_APPROVALS.Dapp.cancelled.origin}
              onConfirm={onConfirm}
            />,
            { state: initialState },
          );

          const secondaryButton = getByText(
            strings('smart_transactions.return_to_dapp', {
              dappName: PENDING_APPROVALS.Dapp.cancelled.origin,
            }),
          );
          fireEvent.press(secondaryButton);
          expect(mockNavigate).not.toHaveBeenCalled();
          expect(onConfirm).toHaveBeenCalled();
        });
      });
      describe('send tx', () => {
        it('should navigate to Send page on press of primary button', () => {
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              requestState={
                // TODO: Replace "any" with type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                PENDING_APPROVALS.Send.cancelled.requestState as any
              }
              origin={PENDING_APPROVALS.Send.cancelled.origin}
              onConfirm={jest.fn()}
            />,
            { state: initialState },
          );

          const primaryButton = getByText(
            strings('smart_transactions.try_again'),
          );
          fireEvent.press(primaryButton);
          expect(mockNavigate).toHaveBeenCalledWith('SendFlowView');
        });
        it('should navigate to Activity page on press of secondary button', () => {
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              requestState={
                // TODO: Replace "any" with type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                PENDING_APPROVALS.Send.cancelled.requestState as any
              }
              origin={PENDING_APPROVALS.Send.cancelled.origin}
              onConfirm={jest.fn()}
            />,
            { state: initialState },
          );

          const secondaryButton = getByText(
            strings('smart_transactions.view_activity'),
          );
          fireEvent.press(secondaryButton);
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });
      describe('MM Swaps flow tx', () => {
        it('should navigate to Swaps page on press of primary button', () => {
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              requestState={
                // TODO: Replace "any" with type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                PENDING_APPROVALS.Swap.cancelled.requestState as any
              }
              origin={PENDING_APPROVALS.Swap.cancelled.origin}
              onConfirm={jest.fn()}
            />,
            {
              state: merge({}, initialState, {
                engine: {
                  backgroundState: {
                    SmartTransactionsController: {
                      smartTransactionsState: {
                        smartTransactions: {
                          '0x1': [
                            PENDING_APPROVALS.Swap.cancelled.requestState
                              .smartTransaction,
                          ],
                        },
                      },
                    },
                  },
                },
              }),
            },
          );

          const primaryButton = getByText(
            strings('smart_transactions.try_again'),
          );
          fireEvent.press(primaryButton);
          expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.ROOT);
        });
        it('should navigate to Activity page on press of secondary button', () => {
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              requestState={
                // TODO: Replace "any" with type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                PENDING_APPROVALS.Swap.cancelled.requestState as any
              }
              origin={PENDING_APPROVALS.Swap.cancelled.origin}
              onConfirm={jest.fn()}
            />,
            {
              state: merge({}, initialState, {
                engine: {
                  backgroundState: {
                    SmartTransactionsController: {
                      smartTransactionsState: {
                        smartTransactions: {
                          '0x1': [
                            PENDING_APPROVALS.Swap.cancelled.requestState
                              .smartTransaction,
                          ],
                        },
                      },
                    },
                  },
                },
              }),
            },
          );

          const secondaryButton = getByText(
            strings('smart_transactions.view_activity'),
          );
          fireEvent.press(secondaryButton);
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });
    });

    describe('failed', () => {
      it('should render failed when STX has unknown status', () => {
        const { getByText } = renderWithProvider(
          <SmartTransactionStatus
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            requestState={PENDING_APPROVALS.Send.unknown.requestState as any}
            origin={PENDING_APPROVALS.Send.unknown.origin}
            onConfirm={jest.fn()}
          />,
          { state: initialState },
        );

        const header = getByText(
          strings('smart_transactions.status_failed_header'),
        );
        expect(header).toBeDefined();
      });

      describe('dapp tx', () => {
        it('should close the Status page on press of secondary button', () => {
          const onConfirm = jest.fn();
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              // TODO: Replace "any" with type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              requestState={PENDING_APPROVALS.Dapp.unknown.requestState as any}
              origin={PENDING_APPROVALS.Dapp.unknown.origin}
              onConfirm={onConfirm}
            />,
            { state: initialState },
          );

          const secondaryButton = getByText(
            strings('smart_transactions.return_to_dapp', {
              dappName: PENDING_APPROVALS.Dapp.unknown.origin,
            }),
          );
          fireEvent.press(secondaryButton);
          expect(mockNavigate).not.toHaveBeenCalled();
          expect(onConfirm).toHaveBeenCalled();
        });
      });
      describe('send tx', () => {
        it('should close the Status page on press of primary button', () => {
          const onConfirm = jest.fn();
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              // TODO: Replace "any" with type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              requestState={PENDING_APPROVALS.Send.unknown.requestState as any}
              origin={PENDING_APPROVALS.Send.unknown.origin}
              onConfirm={onConfirm}
            />,
            { state: initialState },
          );

          const primaryButton = getByText(
            strings('smart_transactions.try_again'),
          );
          fireEvent.press(primaryButton);
          expect(mockNavigate).not.toHaveBeenCalled();
          expect(onConfirm).toHaveBeenCalled();
        });
        it('should navigate to Activity page on press of secondary button', () => {
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              // TODO: Replace "any" with type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              requestState={PENDING_APPROVALS.Send.unknown.requestState as any}
              origin={PENDING_APPROVALS.Send.unknown.origin}
              onConfirm={jest.fn()}
            />,
            { state: initialState },
          );

          const secondaryButton = getByText(
            strings('smart_transactions.view_activity'),
          );
          fireEvent.press(secondaryButton);
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });
      describe('MM Swaps flow tx', () => {
        it('should close the Status page on press of primary button', () => {
          const onConfirm = jest.fn();
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              // TODO: Replace "any" with type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              requestState={PENDING_APPROVALS.Swap.unknown.requestState as any}
              origin={PENDING_APPROVALS.Swap.unknown.origin}
              onConfirm={onConfirm}
            />,
            {
              state: merge({}, initialState, {
                engine: {
                  backgroundState: {
                    SmartTransactionsController: {
                      smartTransactionsState: {
                        smartTransactions: {
                          '0x1': [
                            PENDING_APPROVALS.Swap.unknown.requestState
                              .smartTransaction,
                          ],
                        },
                      },
                    },
                  },
                },
              }),
            },
          );

          const primaryButton = getByText(
            strings('smart_transactions.try_again'),
          );
          fireEvent.press(primaryButton);
          expect(mockNavigate).not.toHaveBeenCalled();
          expect(onConfirm).toHaveBeenCalled();
        });
        it('should navigate to Activity page on press of secondary button', () => {
          const { getByText } = renderWithProvider(
            <SmartTransactionStatus
              // TODO: Replace "any" with type
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              requestState={PENDING_APPROVALS.Swap.unknown.requestState as any}
              origin={PENDING_APPROVALS.Swap.unknown.origin}
              onConfirm={jest.fn()}
            />,
            {
              state: merge({}, initialState, {
                engine: {
                  backgroundState: {
                    SmartTransactionsController: {
                      smartTransactionsState: {
                        smartTransactions: {
                          '0x1': [
                            PENDING_APPROVALS.Swap.unknown.requestState
                              .smartTransaction,
                          ],
                        },
                      },
                    },
                  },
                },
              }),
            },
          );

          const secondaryButton = getByText(
            strings('smart_transactions.view_activity'),
          );
          fireEvent.press(secondaryButton);
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });
    });
  });
});
