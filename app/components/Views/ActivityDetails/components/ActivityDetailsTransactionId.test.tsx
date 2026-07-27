import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { ActivityDetailsTransactionId } from './ActivityDetailsTransactionId';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import ClipboardManager from '../../../../core/ClipboardManager';

jest.mock('../../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));

describe('ActivityDetailsTransactionId', () => {
  const hash =
    '0x85147000000000000000000000000000000000000000000000000000000dabff';

  beforeEach(() => jest.clearAllMocks());

  it('renders nothing without a hash', () => {
    const { toJSON } = renderWithProvider(<ActivityDetailsTransactionId />);
    expect(toJSON()).toBeNull();
  });

  it('renders the shortened hash and copies the full hash on press', () => {
    const { getByTestId } = renderWithProvider(
      <ActivityDetailsTransactionId hash={hash} />,
    );

    fireEvent.press(
      getByTestId(ActivityDetailsSelectorsIDs.TRANSACTION_ID_COPY),
    );

    expect(ClipboardManager.setString).toHaveBeenCalledWith(hash);
  });
});
