import React from 'react';
import { Pressable } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import {
  MusdConversionTooltipModal,
  useMusdConversionTooltip,
} from './useMusdConversionTooltip';
import { strings } from '../../../../../locales/i18n';
import { MUSD_CONVERSION_APY } from '../../Earn/constants/musd';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  ),
}));

const mockStrings = strings as jest.MockedFunction<typeof strings>;

const TEST_ID = 'musd-conversion-tooltip';

describe('useMusdConversionTooltip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and the description interpolated with the conversion APY percentage', () => {
    const { getByText } = render(
      <MusdConversionTooltipModal
        open
        setOpen={jest.fn()}
        tooltipTestId={TEST_ID}
      />,
    );

    expect(getByText('money.deposit_tooltip_title')).toBeOnTheScreen();
    expect(
      getByText(
        `money.deposit_tooltip_description:${JSON.stringify({
          percentage: MUSD_CONVERSION_APY,
        })}`,
      ),
    ).toBeOnTheScreen();
    expect(mockStrings).toHaveBeenCalledWith(
      'money.deposit_tooltip_description',
      { percentage: MUSD_CONVERSION_APY },
    );
  });

  it('does not render the modal content while closed', () => {
    const { queryByText } = render(
      <MusdConversionTooltipModal
        open={false}
        setOpen={jest.fn()}
        tooltipTestId={TEST_ID}
      />,
    );

    expect(queryByText('money.deposit_tooltip_title')).toBeNull();
  });

  it('onInfoPress opens the tooltip and the close button closes it', () => {
    const Harness = () => {
      const { TooltipNode, onInfoPress } = useMusdConversionTooltip(TEST_ID);
      return (
        <>
          <Pressable testID="open-trigger" onPress={onInfoPress} />
          {TooltipNode}
        </>
      );
    };

    const { getByTestId, queryByText } = render(<Harness />);

    expect(queryByText('money.deposit_tooltip_title')).toBeNull();

    fireEvent.press(getByTestId('open-trigger'));
    expect(queryByText('money.deposit_tooltip_title')).not.toBeNull();

    fireEvent.press(getByTestId(`${TEST_ID}-close-btn`));
    expect(queryByText('money.deposit_tooltip_title')).toBeNull();
  });
});
