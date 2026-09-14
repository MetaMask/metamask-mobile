import React, { useContext } from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { FeatureId } from '@metamask/bridge-controller';
import { SwapsFeatureIdContext, SwapsFeatureIdProvider } from './index';

const FeatureIdConsumer = ({ testID }: { testID: string }) => {
  const featureId = useContext(SwapsFeatureIdContext);

  return <Text testID={testID}>{featureId ?? 'none'}</Text>;
};

describe('SwapsFeatureIdProvider', () => {
  it('provides the feature id to a descendant consumer', () => {
    const { getByTestId } = render(
      <SwapsFeatureIdProvider featureId={FeatureId.UNIFIED_SWAP_BRIDGE}>
        <FeatureIdConsumer testID="consumer" />
      </SwapsFeatureIdProvider>,
    );

    expect(getByTestId('consumer')).toHaveTextContent(
      FeatureId.UNIFIED_SWAP_BRIDGE,
    );
  });

  it('provides the same feature id to every descendant consumer', () => {
    const { getByTestId } = render(
      <SwapsFeatureIdProvider featureId={FeatureId.LIMIT_ORDER}>
        <FeatureIdConsumer testID="first" />
        <FeatureIdConsumer testID="second" />
      </SwapsFeatureIdProvider>,
    );

    expect(getByTestId('first')).toHaveTextContent(FeatureId.LIMIT_ORDER);
    expect(getByTestId('second')).toHaveTextContent(FeatureId.LIMIT_ORDER);
  });

  it('overrides the outer feature id for a consumer nested in an inner provider', () => {
    const { getByTestId } = render(
      <SwapsFeatureIdProvider featureId={FeatureId.UNIFIED_SWAP_BRIDGE}>
        <FeatureIdConsumer testID="outer" />
        <SwapsFeatureIdProvider featureId={FeatureId.RECURRING_BUY}>
          <FeatureIdConsumer testID="inner" />
        </SwapsFeatureIdProvider>
      </SwapsFeatureIdProvider>,
    );

    expect(getByTestId('outer')).toHaveTextContent(
      FeatureId.UNIFIED_SWAP_BRIDGE,
    );
    expect(getByTestId('inner')).toHaveTextContent(FeatureId.RECURRING_BUY);
  });

  it('leaves a consumer with no feature id when rendered outside any provider', () => {
    const { getByTestId } = render(<FeatureIdConsumer testID="unscoped" />);

    expect(getByTestId('unscoped')).toHaveTextContent('none');
  });
});
