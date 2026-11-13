import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { fireImpact, ImpactMoment } from '../../../../../util/haptics';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';
import PositionSheetFooter, {
  type PositionSheetFooterProps,
} from './PositionSheetFooter';

jest.mock('../../../../../util/haptics');

const buildProps = (
  overrides: Partial<PositionSheetFooterProps> = {},
): PositionSheetFooterProps => ({
  isPerp: false,
  isClosed: false,
  isOwnPost: false,
  canSell: false,
  onCopyTrade: jest.fn(),
  onPerpsOrder: jest.fn(),
  onSpotTrade: jest.fn(),
  ...overrides,
});

describe('PositionSheetFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('another trader’s open position', () => {
    it('offers Copy trade and no spot buttons', () => {
      render(<PositionSheetFooter {...buildProps()} />);

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.BUY_BUTTON),
      ).toBeNull();
    });

    it('calls onCopyTrade and plays a secondary haptic when Copy trade is pressed', () => {
      const onCopyTrade = jest.fn();
      render(<PositionSheetFooter {...buildProps({ onCopyTrade })} />);

      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON),
      );

      expect(onCopyTrade).toHaveBeenCalledTimes(1);
      expect(fireImpact).toHaveBeenCalledWith(ImpactMoment.SecondaryCTA);
    });
  });

  describe('viewer’s own open spot position', () => {
    it('offers Buy and no Copy trade', () => {
      render(<PositionSheetFooter {...buildProps({ isOwnPost: true })} />);

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.BUY_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON,
        ),
      ).toBeNull();
    });

    it('offers Sell beside Buy when the viewer holds the token', () => {
      render(
        <PositionSheetFooter
          {...buildProps({ isOwnPost: true, canSell: true })}
        />,
      );

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.SELL_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.BUY_BUTTON),
      ).toBeOnTheScreen();
    });

    it('hides Sell when the viewer holds nothing', () => {
      render(
        <PositionSheetFooter
          {...buildProps({ isOwnPost: true, canSell: false })}
        />,
      );

      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.SELL_BUTTON),
      ).toBeNull();
    });

    it('calls onSpotTrade with buy and a primary haptic when Buy is pressed', () => {
      const onSpotTrade = jest.fn();
      render(
        <PositionSheetFooter
          {...buildProps({ isOwnPost: true, onSpotTrade })}
        />,
      );

      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.BUY_BUTTON),
      );

      expect(onSpotTrade).toHaveBeenCalledWith('buy');
      expect(fireImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);
    });

    it('calls onSpotTrade with sell when Sell is pressed', () => {
      const onSpotTrade = jest.fn();
      render(
        <PositionSheetFooter
          {...buildProps({ isOwnPost: true, canSell: true, onSpotTrade })}
        />,
      );

      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.SELL_BUTTON),
      );

      expect(onSpotTrade).toHaveBeenCalledWith('sell');
    });
  });

  describe('viewer’s own open perp', () => {
    it('offers Long and Short and no Copy trade', () => {
      render(
        <PositionSheetFooter
          {...buildProps({ isOwnPost: true, isPerp: true })}
        />,
      );

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.LONG_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.SHORT_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON,
        ),
      ).toBeNull();
    });

    it('calls onPerpsOrder with short when Short is pressed', () => {
      const onPerpsOrder = jest.fn();
      render(
        <PositionSheetFooter
          {...buildProps({ isOwnPost: true, isPerp: true, onPerpsOrder })}
        />,
      );

      fireEvent.press(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.SHORT_BUTTON),
      );

      expect(onPerpsOrder).toHaveBeenCalledWith('short');
    });
  });

  describe('closed positions', () => {
    it.each([true, false])(
      'offers Long and Short on a closed perp (own post: %s)',
      (isOwnPost) => {
        render(
          <PositionSheetFooter
            {...buildProps({ isClosed: true, isPerp: true, isOwnPost })}
          />,
        );

        expect(
          screen.getByTestId(PositionDetailsSheetSelectorsIDs.LONG_BUTTON),
        ).toBeOnTheScreen();
        expect(
          screen.getByTestId(PositionDetailsSheetSelectorsIDs.SHORT_BUTTON),
        ).toBeOnTheScreen();
        expect(
          screen.queryByTestId(
            PositionDetailsSheetSelectorsIDs.COPY_TRADE_BUTTON,
          ),
        ).toBeNull();
      },
    );

    it('offers only Buy on a closed spot position the viewer does not hold', () => {
      render(<PositionSheetFooter {...buildProps({ isClosed: true })} />);

      expect(
        screen.getByTestId(PositionDetailsSheetSelectorsIDs.BUY_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PositionDetailsSheetSelectorsIDs.SELL_BUTTON),
      ).toBeNull();
    });
  });
});
