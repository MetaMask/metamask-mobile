import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import SignatureMessageSection from './signature-message-section';

describe('SignatureMessageSection', () => {
  it('should render collapsed message correctly', async () => {
    const { getByText } = renderWithProvider(
      <SignatureMessageSection
        messageCollapsed="Signature request collapsed message"
        messageExpanded={<Text>Signature request expanded message</Text>}
        copyMessageText="Signature request copy message"
      />,
      {
        state: {},
      },
    );
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Signature request collapsed message')).toBeDefined();
  });

  it('should show expanded view when open button is clicked', async () => {
    const { getByTestId, getByText, getAllByText } = renderWithProvider(
      <SignatureMessageSection
        messageCollapsed="Signature request collapsed message"
        messageExpanded={<Text>Signature request expanded message</Text>}
        copyMessageText="Signature request copy message"
      />,
      {
        state: {},
      },
    );
    expect(getAllByText('Message')).toHaveLength(1);
    expect(getAllByText('Signature request collapsed message')).toHaveLength(1);
    fireEvent.press(getByText('Message'));
    expect(getAllByText('Message')).toHaveLength(2);
    expect(getAllByText('Signature request expanded message')).toHaveLength(1);
    expect(getByTestId('copyButtonTestId')).toBeDefined();
  });
});
