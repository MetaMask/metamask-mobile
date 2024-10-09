import React from 'react';

import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../../util/test/confirm-data-helpers';
import Message from './index';
import { fireEvent } from '@testing-library/react-native';

describe('Message', () => {
  it('should match snapshot', async () => {
    const container = renderWithProvider(<Message />, {
      state: personalSignatureConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });

  it('should show expanded view when open button is clicked', async () => {
    const { getByTestId, getByText, getAllByText } = renderWithProvider(
      <Message />,
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(getAllByText('Message')).toHaveLength(1);
    expect(getAllByText('Example `personal_sign` message')).toHaveLength(1);
    fireEvent.press(getByText('Message'));
    expect(getAllByText('Message')).toHaveLength(2);
    expect(getAllByText('Example `personal_sign` message')).toHaveLength(2);
    expect(getByTestId('copyButtonTestId')).toBeDefined();
  });
});
