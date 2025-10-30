import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import ApprovalText from './ApprovalTooltip';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import enLocale from '../../../../../../locales/languages/en.json';

// Mock the useTooltipModal hook
const mockOpenTooltipModal = jest.fn();
jest.mock('../../../../hooks/useTooltipModal', () => ({
  __esModule: true,
  default: () => ({
    openTooltipModal: mockOpenTooltipModal,
  }),
}));

// Mock the strings function to use actual string values from the locale file
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, values?: Record<string, string>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const mockEnLocale = require('../../../../../../locales/languages/en.json');
    const bridgeStrings = mockEnLocale.bridge as Record<string, string>;
    let template = bridgeStrings[key.replace('bridge.', '')];

    if (values && template) {
      // Replace placeholders like {{amount}} and {{symbol}} with actual values
      Object.entries(values).forEach(([placeholder, value]) => {
        template = template.replace(
          new RegExp(`{{${placeholder}}}`, 'g'),
          value,
        );
      });
    }

    return template || key;
  }),
}));

describe('ApprovalTooltip', () => {
  const defaultProps = {
    amount: '100',
    symbol: 'USDC',
  };

  // Extract actual string constants from the locale file for test assertions
  const APPROVAL_TOOLTIP_TITLE = enLocale.bridge.approval_tooltip_title;
  const APPROVAL_TOOLTIP_CONTENT_TEMPLATE =
    enLocale.bridge.approval_tooltip_content;

  // Helper function to replace template placeholders
  const replaceTemplate = (
    template: string,
    values: Record<string, string>,
  ) => {
    let result = template;
    Object.entries(values).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with given props', () => {
    const { toJSON } = renderScreen(() => <ApprovalText {...defaultProps} />, {
      name: Routes.BRIDGE.ROOT,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays info button with correct accessibility properties', () => {
    const { getByLabelText, getByRole } = renderScreen(
      () => <ApprovalText {...defaultProps} />,
      {
        name: Routes.BRIDGE.ROOT,
      },
    );

    const infoButton = getByLabelText(APPROVAL_TOOLTIP_TITLE);
    expect(infoButton).toBeOnTheScreen();
    expect(getByRole('button')).toBeOnTheScreen();
  });

  it('calls openTooltipModal when info button is pressed', () => {
    const { getByLabelText } = renderScreen(
      () => <ApprovalText {...defaultProps} />,
      {
        name: Routes.BRIDGE.ROOT,
      },
    );

    const infoButton = getByLabelText(APPROVAL_TOOLTIP_TITLE);
    fireEvent.press(infoButton);

    expect(mockOpenTooltipModal).toHaveBeenCalledTimes(1);
    expect(mockOpenTooltipModal).toHaveBeenCalledWith(
      APPROVAL_TOOLTIP_TITLE,
      replaceTemplate(APPROVAL_TOOLTIP_CONTENT_TEMPLATE, defaultProps),
    );
  });

  it('calls handleTooltipPress with correct parameters for different tokens', () => {
    const customProps = {
      amount: '50.5',
      symbol: 'ETH',
    };

    const { getByLabelText } = renderScreen(
      () => <ApprovalText {...customProps} />,
      {
        name: Routes.BRIDGE.ROOT,
      },
    );

    const infoButton = getByLabelText(APPROVAL_TOOLTIP_TITLE);
    fireEvent.press(infoButton);

    expect(mockOpenTooltipModal).toHaveBeenCalledWith(
      APPROVAL_TOOLTIP_TITLE,
      replaceTemplate(APPROVAL_TOOLTIP_CONTENT_TEMPLATE, customProps),
    );
  });

  it('calls tooltip with different amount formats', () => {
    const testCases = [
      { amount: '0.001', symbol: 'BTC' },
      { amount: '1000000', symbol: 'SHIB' },
      { amount: '0', symbol: 'DAI' },
    ];

    testCases.forEach(({ amount, symbol }) => {
      jest.clearAllMocks();

      const { getByLabelText } = renderScreen(
        () => <ApprovalText amount={amount} symbol={symbol} />,
        {
          name: Routes.BRIDGE.ROOT,
        },
      );

      const infoButton = getByLabelText(APPROVAL_TOOLTIP_TITLE);
      fireEvent.press(infoButton);

      expect(mockOpenTooltipModal).toHaveBeenCalledWith(
        APPROVAL_TOOLTIP_TITLE,
        replaceTemplate(APPROVAL_TOOLTIP_CONTENT_TEMPLATE, { amount, symbol }),
      );
    });
  });

  it('handles empty or special characters in props', () => {
    const specialProps = {
      amount: '',
      symbol: '',
    };

    const { getByLabelText } = renderScreen(
      () => <ApprovalText {...specialProps} />,
      {
        name: Routes.BRIDGE.ROOT,
      },
    );

    const infoButton = getByLabelText(APPROVAL_TOOLTIP_TITLE);
    fireEvent.press(infoButton);

    expect(mockOpenTooltipModal).toHaveBeenCalledWith(
      APPROVAL_TOOLTIP_TITLE,
      replaceTemplate(APPROVAL_TOOLTIP_CONTENT_TEMPLATE, specialProps),
    );
  });

  it('calls strings with correct parameters when tooltip is opened', () => {
    const { getByLabelText } = renderScreen(
      () => <ApprovalText {...defaultProps} />,
      {
        name: Routes.BRIDGE.ROOT,
      },
    );

    const infoButton = getByLabelText(APPROVAL_TOOLTIP_TITLE);
    fireEvent.press(infoButton);

    expect(strings).toHaveBeenCalledWith('bridge.approval_tooltip_title');
    expect(strings).toHaveBeenCalledWith('bridge.approval_tooltip_content', {
      amount: '100',
      symbol: 'USDC',
    });
  });

  it('renders button icon with correct structure', () => {
    const { getByLabelText, getByRole } = renderScreen(
      () => <ApprovalText {...defaultProps} />,
      {
        name: Routes.BRIDGE.ROOT,
      },
    );

    const infoButton = getByLabelText(APPROVAL_TOOLTIP_TITLE);
    const button = getByRole('button');

    expect(infoButton).toBeOnTheScreen();
    expect(button).toBeOnTheScreen();
  });
});
