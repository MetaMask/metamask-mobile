Improvement for the close positions

## TAT-1365 Remove internal error for partial close

Current:

- Error “Cannot partial close: remaining position ($3.47) would be below order size ($6). Please close 100% instead”
  Expected:
- There is no need for such error state: a user should be able to close any position size

## Design update

We need to migrate away from a bottomsheet for closing position to the new full screen design as per "temp/Close position.png"
Increase the drag button on the slider since it is hard to select on some android device.

- Margin is not displayed in current bottomsheet we need to follow updated design

## TAT-1413 Position limit close doesn't work

Current behavior:

- Nothing happens after I create my close limit, ie.
- I still see the limit close bottom sheet
- No limit orders appear in my order tab

Expected Behavior:

- Change PnL to “Estimated PnL”

## TAT-1429 Close bottom sheet says I'll receive more than my margin

- There seems to be a bug because apparently currently "How is it possible to receive more than the margin when closing a position?"
