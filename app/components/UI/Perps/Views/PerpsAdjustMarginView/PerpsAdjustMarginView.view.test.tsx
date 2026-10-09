/**
 * Component view tests for PerpsAdjustMarginView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import React from 'react';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import {
  defaultPositionForViews,
  renderPerpsView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { createFundedAccountForViews } from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import {
  PerpsAdjustMarginBottomSheetSelectorsIDs,
  PerpsAdjustMarginViewSelectorsIDs,
  PerpsAmountDisplaySelectorsIDs,
} from '../../Perps.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsAdjustMarginView from './PerpsAdjustMarginView';
import PerpsAdjustMarginBottomSheet from '../../components/PerpsAdjustMarginBottomSheet/PerpsAdjustMarginBottomSheet';

// 1000 USDC available to add → flooredMaxAmount = 1000
// Pressing 25% sets amount to $250, enabling the confirm button
const fundedAccount = createFundedAccountForViews('1000');

const addMarginParams = {
  position: defaultPositionForViews,
  mode: 'add' as const,
};

const removeMarginParams = {
  position: defaultPositionForViews,
  mode: 'remove' as const,
};

describe('PerpsAdjustMarginView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Engine.context.PerpsController.updateMargin).mockResolvedValue({
      success: true,
    });
  });

  it('add mode: confirm is disabled at zero, enabled after choosing 25%, then calls updateMargin on submit', async () => {
    renderPerpsView(
      PerpsAdjustMarginView as unknown as React.ComponentType,
      Routes.PERPS.ADJUST_MARGIN,
      {
        initialParams: addMarginParams,
        streamOverrides: {
          positions: [defaultPositionForViews],
          account: fundedAccount,
        },
      },
    );

    // Initial state: confirm button disabled (amount = $0)
    const confirmButton = await screen.findByTestId(
      PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON,
    );
    expect(confirmButton).toBeDisabled();

    // Tap the amount display to open the keypad
    fireEvent.press(
      screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
    );

    // Done button is now visible (keypad is open)
    const doneButton = await screen.findByTestId(
      PerpsAdjustMarginViewSelectorsIDs.DONE_BUTTON,
    );
    expect(doneButton).toBeOnTheScreen();

    // Press 25% to set amount to $250 (25% of $1000 available)
    fireEvent.press(screen.getByText('25%'));

    // Dismiss keypad via Done
    fireEvent.press(doneButton);

    // Confirm button re-appears and is now enabled
    await waitFor(() => {
      expect(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON),
      ).not.toBeDisabled();
    });

    // Submit the margin adjustment
    fireEvent.press(
      screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON),
    );

    // updateMargin is called exactly once with the ETH position symbol
    await waitFor(() => {
      expect(
        jest.mocked(Engine.context.PerpsController.updateMargin),
      ).toHaveBeenCalledTimes(1);
    });
    expect(
      jest.mocked(Engine.context.PerpsController.updateMargin),
    ).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'ETH' }));
  });

  it('add mode: summary shows margin-in-position and liquidation price labels throughout', async () => {
    renderPerpsView(
      PerpsAdjustMarginView as unknown as React.ComponentType,
      Routes.PERPS.ADJUST_MARGIN,
      {
        initialParams: addMarginParams,
        streamOverrides: { positions: [defaultPositionForViews] },
      },
    );

    // Both summary rows load without interaction
    expect(
      await screen.findByText(
        strings('perps.adjust_margin.margin_in_position'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.adjust_margin.liquidation_price')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.adjust_margin.margin_available_to_add')),
    ).toBeOnTheScreen();
  });

  it('remove mode: confirm button shows "Reduce Margin" label and is disabled at zero', async () => {
    renderPerpsView(
      PerpsAdjustMarginView as unknown as React.ComponentType,
      Routes.PERPS.ADJUST_MARGIN,
      {
        initialParams: removeMarginParams,
        streamOverrides: { positions: [defaultPositionForViews] },
      },
    );

    const confirmButton = await screen.findByTestId(
      PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON,
    );

    // Label reflects remove mode
    expect(
      within(confirmButton).getByText(
        strings('perps.adjust_margin.reduce_margin'),
      ),
    ).toBeOnTheScreen();

    // Disabled at zero amount
    expect(confirmButton).toBeDisabled();

    // Summary labels reflect remove mode copy
    expect(
      screen.getByText(
        strings('perps.adjust_margin.margin_available_to_remove'),
      ),
    ).toBeOnTheScreen();
  });

  it('shows position_not_found error when no position and no mode are supplied', async () => {
    renderPerpsView(
      PerpsAdjustMarginView as unknown as React.ComponentType,
      Routes.PERPS.ADJUST_MARGIN,
      { initialParams: {} },
    );

    expect(
      await screen.findByText(strings('perps.errors.position_not_found')),
    ).toBeOnTheScreen();
  });
});

const position = {
  ...defaultPositionForViews,
  size: '0.5',
  positionValue: '1000',
  marginUsed: '112',
  unrealizedPnl: '0',
};

const BottomSheet = () => (
  <PerpsAdjustMarginBottomSheet position={position} initialMode="remove" />
);

describe.each([
  ['full screen', PerpsAdjustMarginView, PerpsAdjustMarginViewSelectorsIDs],
  ['bottom sheet', BottomSheet, PerpsAdjustMarginBottomSheetSelectorsIDs],
] as const)('Remove margin in the %s', (_surface, Component, selectors) => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('submits the selected Max when a price tick consumes only the buffer', async () => {
    const movedPosition = {
      ...position,
      positionValue: '997',
      marginUsed: '109',
      unrealizedPnl: '-3',
    };
    const updateMargin = jest.spyOn(
      Engine.context.PerpsController,
      'updateMargin',
    );
    jest
      .spyOn(Engine.context.PerpsController, 'getPositions')
      .mockResolvedValue([movedPosition]);
    const { stream } = renderPerpsView(Component, Routes.PERPS.ADJUST_MARGIN, {
      initialParams: { position, mode: 'remove' },
      streamOverrides: { positions: [position] },
    });
    fireEvent.press(
      await screen.findByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
    );
    fireEvent.press(screen.getByText(strings('perps.deposit.max_button')));
    fireEvent.press(screen.getByTestId(selectors.DONE_BUTTON));
    expect(
      screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
    ).toHaveTextContent(/^\$2$/);

    await act(async () => {
      stream.emitPositions([movedPosition]);
    });
    await waitFor(() => {
      expect(screen.getByTestId(selectors.AVAILABLE_VALUE)).toHaveTextContent(
        /^\$0$/,
      );
    });
    const confirmButton = screen.getByTestId(selectors.CONFIRM_BUTTON);
    expect(confirmButton).toBeEnabled();
    expect(
      screen.queryByTestId(selectors.NO_REMOVABLE_MARGIN),
    ).not.toBeOnTheScreen();
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(updateMargin).toHaveBeenCalledWith({
        symbol: 'ETH',
        amount: '-2',
      });
    });
  });
});
