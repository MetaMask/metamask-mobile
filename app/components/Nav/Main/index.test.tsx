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
    it('queues transactionMeta ids correctly', () => {
      const txMetaId = 'foo';
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
      const txMetaId = 'foo';
      const eventEmitter = new EventEmitter();

      const { result } = renderHook(() =>
        useSwapConfirmedEvent({
          TransactionController: {
            hub: eventEmitter,
          },
          swapsTransactions: {
            [txMetaId]: {
              analytics: 'hello',
              paramsForAnalytics: 'world',
            },
          },
          trackSwaps: jest.fn(),
        }),
      );
      act(() => {
        result.current.addTransactionMetaIdForListening(txMetaId);
      });

      expect(eventEmitter.listenerCount(`${txMetaId}:confirmed`)).toBe(1);
    });
    it('tracks Swap Confirmed after transaction confirmed', () => {
      const txMetaId = 'foo';
      const eventEmitter = new EventEmitter();
      const trackSwaps = jest.fn();
      const swapsTransactions = {
        [txMetaId]: {
          analytics: 'hello',
          paramsForAnalytics: 'world',
        },
      };
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
      const txMetaId = 'foo';
      const eventEmitter = new EventEmitter();
      const trackSwaps = jest.fn();
      const swapsTransactions = {
        [txMetaId]: {
          analytics: 'hello',
          paramsForAnalytics: 'world',
        },
      };
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
