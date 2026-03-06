import { IconName } from '../../../../component-library/components/Icons/Icon';
import { TextColor } from '../../../../component-library/components/Texts/Text';
import { getPriceImpactViewData } from './getPriceImpactViewData';

describe('getPriceImpactViewData', () => {
  it.each([
    { priceImpact: undefined },
    { priceImpact: '-0.06%' },
    { priceImpact: '4.99%' },
    { priceImpact: 'invalid' },
  ])(
    'returns alternative text color and no icon for $priceImpact',
    ({ priceImpact }) => {
      expect(getPriceImpactViewData(priceImpact)).toEqual({
        textColor: TextColor.Alternative,
        icon: undefined,
      });
    },
  );

  it.each([
    { priceImpact: '5.00%' },
    { priceImpact: '5.01%' },
    { priceImpact: '24.99%' },
  ])(
    'returns warning text color and warning icon for $priceImpact',
    ({ priceImpact }) => {
      expect(getPriceImpactViewData(priceImpact)).toEqual({
        textColor: TextColor.Warning,
        icon: { name: IconName.Warning, color: TextColor.Warning },
      });
    },
  );

  it.each([{ priceImpact: '25.00%' }, { priceImpact: '25.01%' }])(
    'returns error text color and danger icon for $priceImpact',
    ({ priceImpact }) => {
      expect(getPriceImpactViewData(priceImpact)).toEqual({
        textColor: TextColor.Error,
        icon: { name: IconName.Danger, color: TextColor.Error },
      });
    },
  );
});
