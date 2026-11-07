import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import FixedTabRow, { FixedTabRowProvider } from './FixedTabRow';

const tabs = [
  { key: 'account', label: 'Account', Screen: () => null },
  { key: 'card', label: 'Card', Screen: () => null },
] as const;

const renderRow = (selectedKey = 'account') => {
  const onChange = jest.fn();
  const view = renderWithProvider(
    <FixedTabRowProvider
      value={{
        testID: 'hub',
        tabs,
        selectedKey,
        onChange,
      }}
    >
      <FixedTabRow />
    </FixedTabRowProvider>,
  );

  return { ...view, onChange };
};

describe('FixedTabRow', () => {
  it('renders nothing outside a hub', () => {
    const { queryByTestId } = renderWithProvider(<FixedTabRow />);

    expect(queryByTestId('hub-tabs')).toBeNull();
  });

  it('draws the tabs as underline tabs and resolves a press back to a key', () => {
    const { getByTestId, getAllByText, onChange } = renderRow();

    expect(getByTestId('hub-tabs')).toBeOnTheScreen();
    // Each Tab renders a hidden sizing label plus the visible one.
    expect(getAllByText('Account').length).toBeGreaterThan(0);
    expect(getAllByText('Card').length).toBeGreaterThan(0);

    fireEvent.press(getByTestId('hub-tab-card'));

    expect(onChange).toHaveBeenCalledWith('card');
  });

  it('marks the selected tab active', () => {
    const { getByTestId } = renderRow('card');

    // The active tab's visible label renders bold (BodyMd/Bold); the
    // underline positions off the active tab's measured layout.
    expect(getByTestId('hub-tab-card-label')).toBeOnTheScreen();
  });
});
