// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import type { Country } from '@metamask/ramps-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KalshiPrototypePhoneEntry from './KalshiPrototypePhoneEntry';
import { KalshiPrototypePhoneEntrySelectorsIDs as IDs } from './KalshiPrototypePhoneEntry.testIds';
import { PROTOTYPE_COPY } from './prototypeConstants';
import { PROTOTYPE_PHONE_COUNTRIES } from './prototypePhoneCountries';
import { KalshiPrototypeRoutes } from './prototypeRoutes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const renderScreen = () => {
  const onSend = jest.fn().mockResolvedValue(undefined);
  const onBack = jest.fn();
  const screen = renderWithProvider(
    <KalshiPrototypePhoneEntry onSend={onSend} onBack={onBack} />,
  );
  return { ...screen, onSend, onBack };
};

describe('KalshiPrototypePhoneEntry', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('shows the Kalshi copy and starts on the US dial code', () => {
    const { getByText, getByTestId } = renderScreen();
    expect(getByText(PROTOTYPE_COPY.phoneEntry.title)).toBeOnTheScreen();
    expect(getByTestId(IDs.COUNTRY_BUTTON)).toHaveTextContent(/\+1/);
  });

  it('formats the number to the country template as it is typed', () => {
    const { getByTestId, getByDisplayValue } = renderScreen();
    fireEvent.changeText(getByTestId(IDs.INPUT), '5551234567');
    expect(getByDisplayValue('(555) 123-4567')).toBeOnTheScreen();
  });

  it('sends the full number once it is complete', async () => {
    const { getByTestId, onSend } = renderScreen();
    fireEvent.changeText(getByTestId(IDs.INPUT), '5551234567');
    await act(async () => {
      fireEvent.press(getByTestId(IDs.SEND_BUTTON));
    });
    expect(onSend).toHaveBeenCalledWith('+15551234567', '+1 (555) 123-4567');
  });

  it('shows the error and does not send a short number', async () => {
    const { getByTestId, getByText, onSend } = renderScreen();
    fireEvent.changeText(getByTestId(IDs.INPUT), '555');
    await act(async () => {
      fireEvent.press(getByTestId(IDs.SEND_BUTTON));
    });
    expect(onSend).not.toHaveBeenCalled();
    expect(getByText(PROTOTYPE_COPY.phoneEntry.invalid)).toBeOnTheScreen();
  });

  it('opens the country sheet and switches to the picked country', () => {
    const { getByTestId, getByDisplayValue } = renderScreen();
    fireEvent.press(getByTestId(IDs.COUNTRY_BUTTON));
    expect(mockNavigate).toHaveBeenCalledWith(
      KalshiPrototypeRoutes.PHONE_COUNTRY,
      expect.objectContaining({ countries: PROTOTYPE_PHONE_COUNTRIES }),
    );
    const { onCountrySelect } = mockNavigate.mock.calls[0][1] as {
      onCountrySelect: (country: Country) => void;
    };
    const uk = PROTOTYPE_PHONE_COUNTRIES.find((c) => c.isoCode === 'GB');
    act(() => onCountrySelect(uk as Country));
    expect(getByTestId(IDs.COUNTRY_BUTTON)).toHaveTextContent(/\+44/);
    fireEvent.changeText(getByTestId(IDs.INPUT), '7400123456');
    expect(getByDisplayValue('7400 123456')).toBeOnTheScreen();
  });
});
