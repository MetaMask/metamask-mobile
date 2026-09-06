import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import ClipboardManager from '../../../../../core/ClipboardManager';
import type { ReferralCodeView } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';
import ReferralCodeCard from './ReferralCodeCard';

jest.mock('../../../../../core/ClipboardManager', () => ({
  __esModule: true,
  default: { setString: jest.fn().mockResolvedValue(undefined) },
}));

const createCode = (
  overrides: Partial<ReferralCodeView> = {},
): ReferralCodeView => ({
  code: 'FOX123',
  kind: 'PRIMARY',
  status: 'ACTIVE',
  share_url: 'https://example.test/join?ref=FOX123',
  ...overrides,
});

describe('ReferralCodeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the referral code', () => {
    render(<ReferralCodeCard code={createCode()} />);

    expect(
      screen.getByTestId(REWARDS_MONEY_TEST_IDS.REFERRAL_CODE_VALUE),
    ).toHaveTextContent('FOX123');
  });

  it('copies the code to the clipboard when the copy button is pressed', async () => {
    render(<ReferralCodeCard code={createCode()} />);

    fireEvent.press(screen.getByTestId('rewards-money-copy-code-button'));

    await waitFor(() =>
      expect(ClipboardManager.setString).toHaveBeenCalledWith('FOX123'),
    );
  });

  it('notifies the caller once the code is on the clipboard', async () => {
    const onCopied = jest.fn();
    render(<ReferralCodeCard code={createCode()} onCopied={onCopied} />);

    fireEvent.press(screen.getByTestId('rewards-money-copy-code-button'));

    await waitFor(() => expect(onCopied).toHaveBeenCalledTimes(1));
  });
});
