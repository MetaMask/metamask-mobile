import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import CardHomeStatusView, {
  CARD_HOME_WAITING_COPY,
  CardHomeStatusViewSelectors,
  resolveCardHomeWaitingCopyStep,
} from './CardHomeStatusView';
import { useReduceMotionState } from '../../../../Money/hooks/useReduceMotion';

jest.mock('../../../../Money/hooks/useReduceMotion', () => ({
  useReduceMotionState: jest.fn(() => true),
}));

let mockNetworkTier:
  | 'NONE'
  | 'SLOW_CELLULAR'
  | 'FAST_CELLULAR'
  | 'WIFI'
  | null = null;
let mockHardwareTier: 'LOW' | 'MID' | 'HIGH' | null = null;

jest.mock('../../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockNetworkTier,
}));

jest.mock('../../../../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockHardwareTier,
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
    mockNetworkTier = null;
    mockHardwareTier = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the asset, title, description and primary button', () => {
    const { getByTestId } = renderView();

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
    expect(getByTestId('done-button')).toBeOnTheScreen();
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

  it('shows the button immediately when the device is offline', () => {
    mockUseReduceMotionState.mockReturnValue(false);
    mockNetworkTier = 'NONE';
    mockHardwareTier = null;
    const { getByTestId } = renderView();

    expect(
      getByTestId(CardHomeStatusViewSelectors.FOOTER).props.pointerEvents,
    ).toBe('auto');
  });

  it('shows the button immediately on a low-end phone with a slow connection', () => {
    mockUseReduceMotionState.mockReturnValue(false);
    mockNetworkTier = 'SLOW_CELLULAR';
    mockHardwareTier = 'LOW';
    const { getByTestId } = renderView();

    expect(
      getByTestId(CardHomeStatusViewSelectors.FOOTER).props.pointerEvents,
    ).toBe('auto');
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

describe('resolveCardHomeWaitingCopyStep', () => {
  it('keeps the last settled copy during a reconcile check', () => {
    expect(
      resolveCardHomeWaitingCopyStep('immersve-reconciling', 'identity-review'),
    ).toBe('identity-review');
    expect(
      resolveCardHomeWaitingCopyStep('immersve-reconciling', 'creating-card'),
    ).toBe('creating-card');
  });

  it('uses the neutral checking copy when a reconcile check is the first step', () => {
    expect(resolveCardHomeWaitingCopyStep('immersve-reconciling', null)).toBe(
      'immersve-reconciling',
    );
    expect(CARD_HOME_WAITING_COPY['immersve-reconciling'].titleKey).toBe(
      'card.card_home.setup_pending.checking.title',
    );
  });

  it('returns the step itself once the check has settled', () => {
    expect(resolveCardHomeWaitingCopyStep('creating-card', null)).toBe(
      'creating-card',
    );
  });
});
