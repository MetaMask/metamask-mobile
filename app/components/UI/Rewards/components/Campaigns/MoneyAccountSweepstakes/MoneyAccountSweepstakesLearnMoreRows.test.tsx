import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MoneyAccountSweepstakesLearnMoreRows from './MoneyAccountSweepstakesLearnMoreRows';
import { createMoneyAccountSweepstakesLocalizedText } from './testUtils';
import { handleDeeplink } from '../../../../../../core/DeeplinkManager';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../../core/DeeplinkManager', () => ({
  handleDeeplink: jest.fn(),
}));

const mockHandleDeeplink = handleDeeplink as jest.MockedFunction<
  typeof handleDeeplink
>;

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

const localizedText = createMoneyAccountSweepstakesLocalizedText();

describe('MoneyAccountSweepstakesLearnMoreRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens Money deeplink from the mUSD row', () => {
    const { getByText } = render(
      <MoneyAccountSweepstakesLearnMoreRows
        campaignId="campaign-1"
        localizedText={localizedText}
      />,
    );

    fireEvent.press(getByText(localizedText.learnMusdTitle));

    expect(mockHandleDeeplink).toHaveBeenCalledWith({
      uri: 'metamask://money',
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
