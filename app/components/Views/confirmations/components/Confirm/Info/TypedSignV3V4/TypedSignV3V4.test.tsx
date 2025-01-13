import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { typedSignV3ConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import TypedSignV3V4 from './TypedSignV3V4';
import { fireEvent } from '@testing-library/react-native';

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

  it('should show detailed message when message section is clicked', async () => {
    const { getByText, getAllByText } = renderWithProvider(<TypedSignV3V4 />, {
      state: typedSignV3ConfirmationState,
    });
    fireEvent.press(getByText('Message'));
    expect(getAllByText('Message')).toHaveLength(2);
    expect(getByText('From')).toBeDefined();
    expect(getByText('Cow')).toBeDefined();
    expect(getByText('To')).toBeDefined();
    expect(getByText('Bob')).toBeDefined();
  });
});
