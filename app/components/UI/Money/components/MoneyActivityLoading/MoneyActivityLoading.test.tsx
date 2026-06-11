import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MoneyActivityLoading from './MoneyActivityLoading';
import { MoneyActivityLoadingTestIds } from './MoneyActivityLoading.testIds';

const renderWithProvider = (ui: React.ReactElement) => {
  const store = configureStore({
    reducer: { user: (state = { appTheme: 'light' }) => state },
  });
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('MoneyActivityLoading', () => {
  it('renders the centered spinner container', () => {
    const { getByTestId } = renderWithProvider(<MoneyActivityLoading />);

    expect(
      getByTestId(MoneyActivityLoadingTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });
});
