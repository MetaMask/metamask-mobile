import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import YouReceiveCard from './YouReceiveCard';
import { YouReceiveCardProps } from './YouReceiveCard.types';
import { renderFromWei } from '../../../../../../util/number';
import { strings } from '../../../../../../../locales/i18n';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('YouReceiveCard', () => {
  it('renders estimated changes, received amount, and fiat value', () => {
    const props: YouReceiveCardProps = {
      amountWei: '4999820000000000000',
      amountFiat: '12,881.64',
    };

    const { getByText } = renderWithProvider(<YouReceiveCard {...props} />);

    expect(getByText(strings('stake.estimated_changes'))).toBeOnTheScreen();
    expect(getByText(strings('stake.you_receive'))).toBeOnTheScreen();
    expect(getByText(`+ ${renderFromWei(props.amountWei)}`)).toBeOnTheScreen();
    expect(getByText(`$${props.amountFiat}`)).toBeOnTheScreen();
  });
});
