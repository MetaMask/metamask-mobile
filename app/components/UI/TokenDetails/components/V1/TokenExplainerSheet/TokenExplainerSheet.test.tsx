import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TokenExplainerSheet from './TokenExplainerSheet';
import { TokenExplainerSheetSelectors } from './TokenExplainerSheet.testIds';

describe('TokenExplainerSheet', () => {
  it('renders the copy it is handed', () => {
    const { getByTestId } = render(
      <TokenExplainerSheet
        title="Top 10 holders"
        description="Share held by the ten largest wallets."
        onClose={jest.fn()}
      />,
    );

    expect(getByTestId(TokenExplainerSheetSelectors.TITLE)).toHaveTextContent(
      'Top 10 holders',
    );
    expect(
      getByTestId(TokenExplainerSheetSelectors.DESCRIPTION),
    ).toHaveTextContent('Share held by the ten largest wallets.');
  });

  it('closes when the button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <TokenExplainerSheet
        title="Created"
        description="When the contract was deployed."
        onClose={onClose}
      />,
    );

    fireEvent.press(getByTestId(TokenExplainerSheetSelectors.GOT_IT_BUTTON));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The sheet takes resolved strings rather than i18n keys so that each surface
  // owns its own copy map. A regression that reintroduced a key lookup would
  // render the key path on device, which this catches.
  it('does not treat its props as translation keys', () => {
    const { getByTestId } = render(
      <TokenExplainerSheet
        title="some.key.path"
        description="another.key.path"
        onClose={jest.fn()}
      />,
    );

    expect(getByTestId(TokenExplainerSheetSelectors.TITLE)).toHaveTextContent(
      'some.key.path',
    );
  });
});
