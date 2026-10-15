import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import MarketingConsentSheet from './MarketingConsentSheet';
import { strings } from '../../../../locales/i18n';

const TEST_ID = 'marketing-consent-sheet';

const renderSheet = (onConfirm: () => Promise<void>) => {
  const onDismiss = jest.fn();
  const utils = renderWithProvider(
    <MarketingConsentSheet
      title="Title"
      description={<Text>Description</Text>}
      confirmLabel="Turn on"
      onConfirm={onConfirm}
      onDismiss={onDismiss}
      testID={TEST_ID}
    />,
  );
  return { ...utils, onDismiss };
};

describe('MarketingConsentSheet', () => {
  it('renders the title, description and actions', () => {
    const { getByText } = renderSheet(jest.fn());

    expect(getByText('Title')).toBeOnTheScreen();
    expect(getByText('Description')).toBeOnTheScreen();
    expect(getByText('Turn on')).toBeOnTheScreen();
    expect(
      getByText(strings('marketing_consent_sheet.cancel')),
    ).toBeOnTheScreen();
  });

  it('closes once the choice is saved', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const { getByTestId, onDismiss } = renderSheet(onConfirm);

    fireEvent.press(getByTestId(`${TEST_ID}-confirm`));

    await waitFor(() => expect(onDismiss).toHaveBeenCalled());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('stays open with an error when saving fails', async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error('AUS error'));
    const { getByTestId, findByTestId, onDismiss } = renderSheet(onConfirm);

    fireEvent.press(getByTestId(`${TEST_ID}-confirm`));

    expect(await findByTestId(`${TEST_ID}-error`)).toBeOnTheScreen();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('closes without saving on cancel', async () => {
    const onConfirm = jest.fn();
    const { getByTestId, onDismiss } = renderSheet(onConfirm);

    fireEvent.press(getByTestId(`${TEST_ID}-cancel`));

    await waitFor(() => expect(onDismiss).toHaveBeenCalled());
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
