import { IconName } from '@metamask/design-system-react-native';
import { resolveHomepagePredictSlotIconName } from './resolveHomepagePredictSlotIconName';

describe('resolveHomepagePredictSlotIconName', () => {
  it.each([IconName.Basketball, IconName.SoccerBall, IconName.Trophy])(
    'resolves the design-system icon %s',
    (iconName) => {
      expect(resolveHomepagePredictSlotIconName(iconName)).toBe(iconName);
    },
  );

  it.each([undefined, '', 'FutureIcon'])(
    'resolves %p to no icon so the row keeps its default glyph',
    (iconName) => {
      expect(resolveHomepagePredictSlotIconName(iconName)).toBeUndefined();
    },
  );
});
