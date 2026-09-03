import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  FontWeight,
  Icon,
  IconName,
  Tag,
  TagSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { initialState } from '../../_mocks_/initialState';
import { USDC_DEST } from '../../_mocks_/bridgeViewTestConstants';
import type { BridgeToken } from '../../types';
import OpenOrderRow from './OpenOrderRow';
import { OpenOrderRowSelectorsIDs } from './OpenOrderRow.testIds';
import type { OpenOrderRowProps } from './OpenOrderRow.types';

const DEST_TOKEN: BridgeToken = { ...USDC_DEST };

const LIMIT_PROPS = {
  token: DEST_TOKEN,
  title: strings('bridge.limit.pair', {
    source: 'ETH',
    dest: DEST_TOKEN.symbol,
  }),
  subtitle: strings('bridge.limit.expiry', { timeLeft: '4d left' }),
  primaryValue: '$208.99',
  secondaryValue: strings('bridge.limit.limit_price', {
    symbol: DEST_TOKEN.symbol,
  }),
  subtitleFontWeight: FontWeight.Medium,
};

const RECURRING_PROPS = {
  token: DEST_TOKEN,
  title: strings('bridge.recurring.pair', {
    source: 'ETH',
    dest: DEST_TOKEN.symbol,
  }),
  subtitle: strings('bridge.recurring.schedule_summary', {
    interval: '1 day',
    count: '5',
  }),
  primaryValue: `+0.325 ${DEST_TOKEN.symbol}`,
  secondaryValue: strings('bridge.recurring.percent_filled', {
    percent: '49',
  }),
  primaryColor: TextColor.SuccessDefault,
};

function renderOpenOrderRow(props: OpenOrderRowProps) {
  return renderWithProvider(<OpenOrderRow {...props} />, {
    state: initialState,
  });
}

describe('OpenOrderRow', () => {
  it('renders limit order pair, expiry, and limit price', () => {
    const { getByTestId } = renderOpenOrderRow(LIMIT_PROPS);

    expect(getByTestId(OpenOrderRowSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(OpenOrderRowSelectorsIDs.TITLE)).toHaveTextContent(
      'ETH → USDC',
    );
    expect(getByTestId(OpenOrderRowSelectorsIDs.SUBTITLE)).toHaveTextContent(
      'Expiry: 4d left',
    );
    expect(getByTestId(OpenOrderRowSelectorsIDs.PRIMARY)).toHaveTextContent(
      '$208.99',
    );
    expect(getByTestId(OpenOrderRowSelectorsIDs.SECONDARY)).toHaveTextContent(
      'USDC limit price',
    );
  });

  it('renders recurring filled amount in success color', () => {
    const { getByTestId } = renderOpenOrderRow(RECURRING_PROPS);

    expect(getByTestId(OpenOrderRowSelectorsIDs.TITLE)).toHaveTextContent(
      'ETH → USDC',
    );
    expect(getByTestId(OpenOrderRowSelectorsIDs.SUBTITLE)).toHaveTextContent(
      '1 day / 5 orders',
    );
    expect(getByTestId(OpenOrderRowSelectorsIDs.PRIMARY)).toHaveTextContent(
      '+0.325 USDC',
    );
    expect(getByTestId(OpenOrderRowSelectorsIDs.SECONDARY)).toHaveTextContent(
      '49% filled',
    );
  });

  it('calls onPress when the row is pressed', () => {
    const onPress = jest.fn();

    const { getByTestId } = renderOpenOrderRow({ ...LIMIT_PROPS, onPress });

    fireEvent.press(getByTestId(OpenOrderRowSelectorsIDs.CONTAINER));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders warning subtitle and title accessory for insufficient gas', () => {
    const { getByTestId } = renderOpenOrderRow({
      ...LIMIT_PROPS,
      subtitle: strings('bridge.limit.not_enough_gas'),
      titleColor: TextColor.WarningDefault,
      subtitleColor: TextColor.WarningDefault,
      titleEndAccessory: <Icon name={IconName.Warning} />,
    });

    expect(getByTestId(OpenOrderRowSelectorsIDs.SUBTITLE)).toHaveTextContent(
      'Not enough gas',
    );
    expect(
      getByTestId(OpenOrderRowSelectorsIDs.TITLE_END_ACCESSORY),
    ).toBeOnTheScreen();
  });

  it('renders filled tag after the pair title', () => {
    const { getByTestId } = renderOpenOrderRow({
      ...LIMIT_PROPS,
      subtitle: strings('bridge.limit.filled_at', { date: 'Mar 12' }),
      primaryValue: `+0.325 ${DEST_TOKEN.symbol}`,
      secondaryValue: '-0.1 ETH',
      primaryColor: TextColor.SuccessDefault,
      titleEndAccessory: (
        <Tag severity={TagSeverity.Success}>
          {strings('bridge.limit.filled')}
        </Tag>
      ),
    });

    expect(getByTestId(OpenOrderRowSelectorsIDs.SUBTITLE)).toHaveTextContent(
      'Filled at Mar 12',
    );
    expect(
      getByTestId(OpenOrderRowSelectorsIDs.TITLE_END_ACCESSORY),
    ).toHaveTextContent('Filled');
    expect(getByTestId(OpenOrderRowSelectorsIDs.PRIMARY)).toHaveTextContent(
      '+0.325 USDC',
    );
  });
});
