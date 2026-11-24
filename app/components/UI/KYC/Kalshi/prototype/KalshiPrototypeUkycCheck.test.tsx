// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import KalshiPrototypeUkycCheck from './KalshiPrototypeUkycCheck';
import { KalshiPrototypeUkycCheckSelectorsIDs } from './KalshiPrototypeUkycCheck.testIds';

describe('KalshiPrototypeUkycCheck', () => {
  it('answers true on Yes, for the returning-user path', () => {
    const onAnswered = jest.fn();
    const screen = render(<KalshiPrototypeUkycCheck onAnswered={onAnswered} />);

    fireEvent.press(
      screen.getByTestId(KalshiPrototypeUkycCheckSelectorsIDs.YES_BUTTON),
    );

    expect(onAnswered).toHaveBeenCalledWith(true);
  });

  it('answers false on No, for the new-user path', () => {
    const onAnswered = jest.fn();
    const screen = render(<KalshiPrototypeUkycCheck onAnswered={onAnswered} />);

    fireEvent.press(
      screen.getByTestId(KalshiPrototypeUkycCheckSelectorsIDs.NO_BUTTON),
    );

    expect(onAnswered).toHaveBeenCalledWith(false);
  });

  it('shows the placeholder copy the prototype owns', () => {
    const screen = render(<KalshiPrototypeUkycCheck onAnswered={jest.fn()} />);

    expect(
      screen.getByText('[PROTO] Already completed UKYC?'),
    ).toBeOnTheScreen();
  });
});
