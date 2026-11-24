// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KalshiPrototypeEmailEntry from './KalshiPrototypeEmailEntry';
import { KalshiPrototypeEmailEntrySelectorsIDs as IDs } from './KalshiPrototypeEmailEntry.testIds';
import { PROTOTYPE_COPY } from './prototypeConstants';

const renderScreen = () => {
  const onSend = jest.fn().mockResolvedValue(undefined);
  const onBack = jest.fn();
  const screen = renderWithProvider(
    <KalshiPrototypeEmailEntry onSend={onSend} onBack={onBack} />,
  );
  return { ...screen, onSend, onBack };
};

describe('KalshiPrototypeEmailEntry', () => {
  it('shows the Kalshi copy', () => {
    const { getByText } = renderScreen();
    expect(getByText(PROTOTYPE_COPY.emailEntry.title)).toBeOnTheScreen();
    expect(getByText(PROTOTYPE_COPY.emailEntry.body)).toBeOnTheScreen();
  });

  it('sends a valid address, trimmed', async () => {
    const { getByTestId, getByPlaceholderText, onSend } = renderScreen();
    fireEvent.changeText(
      getByPlaceholderText(PROTOTYPE_COPY.emailEntry.placeholder),
      ' connor@example.com ',
    );
    await act(async () => {
      fireEvent.press(getByTestId(IDs.SEND_BUTTON));
    });
    expect(onSend).toHaveBeenCalledWith('connor@example.com');
  });

  it('shows the error and does not send an invalid address', async () => {
    const { getByTestId, getByPlaceholderText, getByText, onSend } =
      renderScreen();
    fireEvent.changeText(
      getByPlaceholderText(PROTOTYPE_COPY.emailEntry.placeholder),
      'connor@',
    );
    await act(async () => {
      fireEvent.press(getByTestId(IDs.SEND_BUTTON));
    });
    expect(onSend).not.toHaveBeenCalled();
    expect(getByText(PROTOTYPE_COPY.emailEntry.invalid)).toBeOnTheScreen();
  });
});
