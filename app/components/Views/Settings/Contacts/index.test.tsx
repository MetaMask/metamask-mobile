import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import Contacts from './';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { ContactsViewSelectorIDs } from './ContactsView.testIds';

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('Contacts', () => {
  it('renders correctly', () => {
    const { toJSON } = renderScreen(
      Contacts,
      { name: 'ContactsSettings' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders inline header with Contacts title', () => {
    const { getByTestId, getByText } = renderScreen(
      Contacts,
      { name: 'ContactsSettings' },
      { state: initialState },
    );
    expect(getByTestId(ContactsViewSelectorIDs.HEADER)).toBeTruthy();
    expect(getByText('Contacts')).toBeTruthy();
  });

  it('calls navigation.goBack when header back button is pressed', () => {
    const { getByTestId } = renderScreen(
      Contacts,
      { name: 'ContactsSettings' },
      { state: initialState },
    );
    const backButton = getByTestId('button-icon');
    fireEvent.press(backButton);
  });
});
