import React from 'react';
import {
  FontWeight,
  Icon,
  IconName,
  IconSize,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { View } from '../../primitives/View';
import { Text } from '../../primitives/Text';
import { CapsuleGlass } from '../../primitives/CapsuleGlass';

const flameThreshold = 20_000;

interface Props {
  code: string;
  openedCount: number;
  className?: string;
}

export function PackOpensBadge({ code, openedCount, className }: Props) {
  const formattedCount = getIntlNumberFormatter(I18n.locale).format(
    openedCount,
  );
  const isTrending = openedCount >= flameThreshold;

  return (
    <View
      className={className}
      accessible
      accessibilityLabel={strings(
        isTrending
          ? 'collectibles.home.opens_trending'
          : 'collectibles.home.opens',
        { count: openedCount, formattedCount },
      )}
    >
      <CapsuleGlass className="h-6 gap-1 px-2">
        {isTrending && (
          <Icon
            name={IconName.Fire}
            size={IconSize.Xs}
            testID={collectiblesTestIds.flame(code)}
          />
        )}
        <Text variant={TextVariant.BodyXs} fontWeight={FontWeight.Medium}>
          {formattedCount}
        </Text>
      </CapsuleGlass>
    </View>
  );
}
