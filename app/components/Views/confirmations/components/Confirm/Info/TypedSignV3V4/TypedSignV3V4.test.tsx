import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import {
  typedSignV3ConfirmationState,
  typedSignV4ConfirmationState,
} from '../../../../../../../util/test/confirm-data-helpers';
import TypedSignV3V4 from './TypedSignV3V4';
import { fireEvent } from '@testing-library/react-native';

jest.mock('../../../../../../../core/Engine', () => ({
  resetState: jest.fn(),
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: () => 123,
    },
  },
}));

describe('TypedSignV3V4', () => {
  it('should contained required text', async () => {
    const { getByText } = renderWithProvider(<TypedSignV3V4 />, {
      state: typedSignV3ConfirmationState,
    });
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Primary type')).toBeDefined();
    expect(getByText('Mail')).toBeDefined();
  });

  it('should not display primaty type if simulation section is displayed', async () => {
    const { getByText, queryByText } = renderWithProvider(<TypedSignV3V4 />, {
      state: typedSignV4ConfirmationState,
    });
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getByText('Message')).toBeDefined();
    expect(queryByText('Primary type')).toBeNull();
    expect(queryByText('Mail')).toBeNull();
  });

  it('should show detailed message when message section is clicked', async () => {
    const { getByText, getAllByText } = renderWithProvider(<TypedSignV3V4 />, {
      state: typedSignV3ConfirmationState,
    });
    fireEvent.press(getByText('Message'));
    expect(getAllByText('Message')).toHaveLength(3);
    expect(getByText('From')).toBeDefined();
    expect(getByText('Cow')).toBeDefined();
    expect(getByText('To')).toBeDefined();
    expect(getByText('Bob')).toBeDefined();
  });
});
