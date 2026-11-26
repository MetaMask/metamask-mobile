import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PriceRangeSheet from './PriceRangeSheet';
import { PriceRangeSheetSelectorsIDs } from './PriceRangeSheet.testIds';
import { createMockToken } from '../../testUtils/fixtures';
import { playSelection } from '../../../../../util/haptics';
import {
  applyPercentToPrice,
  getPriceRangeDecimals,
} from '../../utils/priceRange';

jest.mock('../../../../../util/haptics');

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => false),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: ReactModule.forwardRef(
      (
        { children, testID }: { children?: React.ReactNode; testID?: string },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: jest.fn(),
        }));

        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

jest.mock('../SwapsKeypad', () => {
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    SwapsKeypad: ReactModule.forwardRef(() => <View testID="swaps-keypad" />),
  };
});

const sourceToken = createMockToken({ symbol: 'ETH' });
const destToken = createMockToken({
  address: '0x0000000000000000000000000000000000000001',
  symbol: 'USDC',
  decimals: 6,
});

function renderSheet({
  initialMin,
  destFiatRate = 100,
}: {
  initialMin?: string;
  destFiatRate?: number;
} = {}) {
  return render(
    <PriceRangeSheet
      sourceToken={sourceToken}
      destToken={destToken}
      currency="usd"
      sourceFiatRate={2000}
      destFiatRate={destFiatRate}
      initialTokenSide="dest"
      initialMin={initialMin}
      onConfirm={jest.fn()}
      goBack={jest.fn()}
    />,
  );
}

describe('PriceRangeSheet haptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('plays selection feedback only when the token side changes', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(PriceRangeSheetSelectorsIDs.TOKEN_OPTION('source')),
    );
    fireEvent.press(
      getByTestId(PriceRangeSheetSelectorsIDs.TOKEN_OPTION('source')),
    );

    expect(playSelection).toHaveBeenCalledTimes(1);
  });

  it('plays selection feedback only when a percent preset changes the value', () => {
    const { getByTestId } = renderSheet({
      initialMin: applyPercentToPrice(100, -1, getPriceRangeDecimals(100)),
    });

    fireEvent.press(
      getByTestId(PriceRangeSheetSelectorsIDs.PERCENT('min', -1)),
    );
    expect(playSelection).not.toHaveBeenCalled();

    fireEvent.press(
      getByTestId(PriceRangeSheetSelectorsIDs.PERCENT('min', -5)),
    );
    expect(playSelection).toHaveBeenCalledTimes(1);
  });
});
