/* eslint-disable import/no-nodejs-modules */
import React from 'react';
import { shallow } from 'enzyme';
// eslint-disable-next-line import/named
import { NavigationContainer } from '@react-navigation/native';
import EventEmitter from 'events';
import Main from './';
import { useSwapConfirmedEvent } from './RootRPCMethodsUI';
import { renderHook, act } from '@testing-library/react-hooks';
import { MetaMetricsEvents } from '../../hooks/useMetrics';

describe('Main', () => {
  it('should render correctly', () => {
    const MainAppContainer = () => (
      <NavigationContainer>
        <Main />
      </NavigationContainer>
    );
    const wrapper = shallow(<MainAppContainer />);
    expect(wrapper).toMatchSnapshot();
  });

  describe('useSwapConfirmedEvent', () => {
    const txMetaId = '04541dc0-2e69-11ef-b995-33aef2c88d1e';
    const swapsTransactions = {
      [txMetaId]: {
        action: 'swap',
        analytics: {
          available_quotes: 5,
          best_quote_source: 'oneInchV5',
          chain_id: '1',
          custom_slippage: false,
          network_fees_ETH: '0.00337',
          network_fees_USD: '$12.04',
          other_quote_selected: false,
          request_type: 'Order',
          token_from: 'ETH',
          token_from_amount: '0.001254',
          token_to: 'USDC',
          token_to_amount: '4.440771',
        },
        destinationAmount: '4440771',
        destinationToken: {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          decimals: 6,
        },
        paramsForAnalytics: {
          approvalTransactionMetaId: {},
          ethAccountBalance: '0xedfffbea734a07',
          gasEstimate: '0x33024',
          sentAt: '0x66732203',
        },
        sourceAmount: '1254000000000000',
        sourceAmountInFiat: '$4.47',
        sourceToken: {
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
        },
      },
    };

    it('queues transactionMeta ids correctly', () => {
      const eventEmitter = new EventEmitter();

      const { result } = renderHook(() =>
        useSwapConfirmedEvent({
          TransactionController: {
            hub: eventEmitter,
          },
          swapsTransactions: {}, // This has to be empty object, otherwise test fails
          trackSwaps: jest.fn(),
        }),
      );
      act(() => {
        result.current.addTransactionMetaIdForListening(txMetaId);
      });

      expect(result.current.transactionMetaIdsForListening).toEqual([txMetaId]);
    });
    it('adds a listener for transaction confirmation on the TransactionController', () => {
      const eventEmitter = new EventEmitter();

      const { result } = renderHook(() =>
        useSwapConfirmedEvent({
          TransactionController: {
            hub: eventEmitter,
          },
          swapsTransactions,
          trackSwaps: jest.fn(),
        }),
      );
      act(() => {
        result.current.addTransactionMetaIdForListening(txMetaId);
      });

      expect(eventEmitter.listenerCount(`${txMetaId}:confirmed`)).toBe(1);
    });
    it('tracks Swap Confirmed after transaction confirmed', () => {
      const eventEmitter = new EventEmitter();
      const trackSwaps = jest.fn();
      const txMeta = {
        id: txMetaId,
      };

      const { result } = renderHook(() =>
        useSwapConfirmedEvent({
          TransactionController: {
            hub: eventEmitter,
          },
          swapsTransactions,
          trackSwaps,
        }),
      );
      act(() => {
        result.current.addTransactionMetaIdForListening(txMetaId);
      });
      eventEmitter.emit(`${txMetaId}:confirmed`, txMeta);

      expect(trackSwaps).toHaveBeenCalledWith(
        MetaMetricsEvents.SWAP_COMPLETED,
        txMeta,
        swapsTransactions,
      );
    });
    it('removes transactionMeta id after tracking', () => {
      const eventEmitter = new EventEmitter();
      const trackSwaps = jest.fn();
      const txMeta = {
        id: txMetaId,
      };

      const { result } = renderHook(() =>
        useSwapConfirmedEvent({
          TransactionController: {
            hub: eventEmitter,
          },
          swapsTransactions,
          trackSwaps,
        }),
      );
      act(() => {
        result.current.addTransactionMetaIdForListening(txMetaId);
      });
      eventEmitter.emit(`${txMetaId}:confirmed`, txMeta);

      expect(result.current.transactionMetaIdsForListening).toEqual([]);
    });
  });
});
