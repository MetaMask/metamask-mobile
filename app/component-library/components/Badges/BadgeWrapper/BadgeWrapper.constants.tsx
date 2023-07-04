/* eslint-disable import/prefer-default-export */
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import Badge from '../Badge/Badge';
import { SAMPLE_BADGENETWORK_PROPS } from '../Badge/variants/BadgeNetwork/BadgeNetwork.constants';
import { mockTheme } from '../../../../util/theme';
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import {
  BadgeAnchorElementShape,
  BadgePosition,
  BadgeWrapperProps,
} from './BadgeWrapper.types';

// Test IDs
export const BADGE_WRAPPER_BADGE_TEST_ID = 'badge-wrapper-badge';

// Defaults
export const DEFAULT_BADGEWRAPPER_BADGEANCHORELEMENTSHAPE =
  BadgeAnchorElementShape.Circular;
export const DEFAULT_BADGEWRAPPER_BADGEPOSITION = BadgePosition.TopRight;

// Samples
export const SAMPLE_BADGEWRAPPER_PROPS: BadgeWrapperProps = {
  anchorElementShape: DEFAULT_BADGEWRAPPER_BADGEANCHORELEMENTSHAPE,
  badgePosition: DEFAULT_BADGEWRAPPER_BADGEPOSITION,
  badgeElement: <Badge {...SAMPLE_BADGENETWORK_PROPS} />,
  children: (
    <View
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        height: 24,
        width: 24,
        borderRadius: 12,
        backgroundColor: mockTheme.colors.background.default,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant={TextVariant.BodySM}>{'C'}</Text>
    </View>
  ),
};
