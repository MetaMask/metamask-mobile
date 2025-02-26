import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { SwapsSTXStatusModal } from './SwapsSTXStatusModal';
import { backgroundState } from '../../../util/test/initial-root-state';
import { fireEvent } from '@testing-library/react-native';
import { merge } from 'lodash';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  })),
}));

const state = {
  engine: {
    backgroundState: {
      ...backgroundState,
      SmartTransactionsController: {
        smartTransactionsState: {
          smartTransactions: {
            '0x1': [{
              uuid: '123',
              status: 'pending',
              type: 'swap',
            }],
          },
        },
      },
    },
  },
};

describe('SwapsSTXStatusModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render', () => {
    const { getByText } = renderWithProvider(<SwapsSTXStatusModal isVisible dismiss={jest.fn()} />, {
      state,
    });
    expect(getByText('View transaction')).toBeDefined();
  });
});
