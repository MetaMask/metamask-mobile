import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import MicaDisclaimer from './MicaDisclaimer';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import Logger from '../../../../../util/Logger';

const FMA_LINK = 'https://fma.example';
const EU_LINK = 'https://eu.example';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    if (key === 'deposit.mica.fmaLink') return 'https://fma.example';
    if (key === 'deposit.mica.euLink') return 'https://eu.example';
    if (key === 'deposit.mica.buyDisclaimer') {
      return `Buy risk: ${params?.fmaLink} and ${params?.euLink} apply.`;
    }
    if (key === 'deposit.mica.sellDisclaimer') {
      return `Sell risk: ${params?.fmaLink} and ${params?.euLink} apply.`;
    }
    return key;
  },
  I18nEvents: { addListener: jest.fn() },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

const renderDisclaimer = (termsIds?: string[]) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      <MicaDisclaimer termsIds={termsIds} />
    </ThemeContext.Provider>,
  );

describe('MicaDisclaimer', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    openURL.mockRestore();
  });

  it('renders nothing when there are no terms ids', () => {
    const { toJSON } = renderDisclaimer(undefined);

    expect(toJSON()).toBeNull();
  });

  it('renders nothing when no MiCA terms id is present', () => {
    const { toJSON } = renderDisclaimer(['SOMETHING_ELSE']);

    expect(toJSON()).toBeNull();
  });

  it('renders the buy disclaimer for MICA_EEA_BUY', () => {
    const { getByText } = renderDisclaimer(['MICA_EEA_BUY']);

    expect(getByText(/Buy risk:/)).toBeOnTheScreen();
    expect(getByText(FMA_LINK)).toBeOnTheScreen();
    expect(getByText(EU_LINK)).toBeOnTheScreen();
  });

  it('renders the sell disclaimer for MICA_EEA_SELL', () => {
    const { getByText } = renderDisclaimer(['MICA_EEA_SELL']);

    expect(getByText(/Sell risk:/)).toBeOnTheScreen();
  });

  it('renders one disclaimer per MiCA terms id', () => {
    const { getByText } = renderDisclaimer(['MICA_EEA_BUY', 'MICA_EEA_SELL']);

    expect(getByText(/Buy risk:/)).toBeOnTheScreen();
    expect(getByText(/Sell risk:/)).toBeOnTheScreen();
  });

  it('opens the FMA link when pressed', () => {
    const { getByText } = renderDisclaimer(['MICA_EEA_BUY']);

    fireEvent.press(getByText(FMA_LINK));

    expect(openURL).toHaveBeenCalledWith(FMA_LINK);
  });

  it('opens the EU link when pressed', () => {
    const { getByText } = renderDisclaimer(['MICA_EEA_BUY']);

    fireEvent.press(getByText(EU_LINK));

    expect(openURL).toHaveBeenCalledWith(EU_LINK);
  });

  it('logs an error when a link fails to open', async () => {
    const failure = new Error('cannot open');
    openURL.mockRejectedValue(failure);
    const { getByText } = renderDisclaimer(['MICA_EEA_BUY']);

    fireEvent.press(getByText(FMA_LINK));
    await Promise.resolve();
    await Promise.resolve();

    expect(Logger.error).toHaveBeenCalledWith(failure, 'Failed to open link');
  });
});
