import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import CardHomeStatusView, {
  CardHomeStatusViewSelectors,
} from './CardHomeStatusView';
import { useReduceMotionState } from '../../../../Money/hooks/useReduceMotion';

jest.mock('../../../../Money/hooks/useReduceMotion', () => ({
  useReduceMotionState: jest.fn(() => true),
}));

const mockUseReduceMotionState = jest.mocked(useReduceMotionState);

const renderView = (onPress = jest.fn()) =>
  render(
    <CardHomeStatusView
      asset={<Text testID="status-asset">Card art</Text>}
      title="Verifying your identity"
      description="Most applications are reviewed within a few hours."
      primaryButton={{ label: 'Done', onPress, testID: 'done-button' }}
    />,
  );

describe('CardHomeStatusView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseReduceMotionState.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the asset, title, description and primary button', () => {
    const { getByTestId, getByText } = renderView();

    expect(
      getByTestId(CardHomeStatusViewSelectors.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByTestId(CardHomeStatusViewSelectors.ASSET)).toBeOnTheScreen();
    expect(getByTestId('status-asset')).toBeOnTheScreen();
    expect(getByTestId(CardHomeStatusViewSelectors.TITLE)).toHaveTextContent(
      'Verifying your identity',
    );
    expect(
      getByTestId(CardHomeStatusViewSelectors.DESCRIPTION),
    ).toHaveTextContent('Most applications are reviewed within a few hours.');
    expect(getByText('Done')).toBeOnTheScreen();
  });

  it('calls the primary action when the button is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderView(onPress);

    fireEvent.press(getByTestId('done-button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses the default button testID when none is given', () => {
    const { getByTestId } = render(
      <CardHomeStatusView
        asset={null}
        title="Title"
        description="Body"
        primaryButton={{ label: 'Done', onPress: jest.fn() }}
      />,
    );

    expect(
      getByTestId(CardHomeStatusViewSelectors.PRIMARY_BUTTON),
    ).toBeOnTheScreen();
  });

  it('keeps the button untappable until its fade-in starts', () => {
    mockUseReduceMotionState.mockReturnValue(false);
    const { getByTestId } = renderView();
    const footer = getByTestId(CardHomeStatusViewSelectors.FOOTER);

    expect(footer.props.pointerEvents).toBe('none');

    act(() => {
      jest.runAllTimers();
    });

    expect(
      getByTestId(CardHomeStatusViewSelectors.FOOTER).props.pointerEvents,
    ).toBe('auto');
  });

  it('renders with the breathing prop active', () => {
    const { getByTestId } = render(
      <CardHomeStatusView
        asset={<Text testID="status-asset">Card art</Text>}
        title="We're reviewing your identity"
        description="This can take a little while."
        breathing
        primaryButton={{ label: 'Done', onPress: jest.fn() }}
      />,
    );

    expect(getByTestId(CardHomeStatusViewSelectors.ASSET)).toBeOnTheScreen();
    expect(getByTestId(CardHomeStatusViewSelectors.TITLE)).toBeOnTheScreen();
  });

  it('withholds interaction while the Reduce Motion check is pending', () => {
    mockUseReduceMotionState.mockReturnValue(null);
    const { getByTestId } = renderView();

    act(() => {
      jest.runAllTimers();
    });

    expect(
      getByTestId(CardHomeStatusViewSelectors.FOOTER).props.pointerEvents,
    ).toBe('none');
  });
});
