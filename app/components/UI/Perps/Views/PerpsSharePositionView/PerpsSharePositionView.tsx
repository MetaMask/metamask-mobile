import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  StackActions,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  Tag,
  TagSeverity,
} from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import Foxicon, {
  FoxiconVariant,
} from '../../../../../component-library/components-temp/Foxicon';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useOpenSocialPostComposer } from '../../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer';
import {
  getPerpsShareDirection,
  postPerpsPositionToFeed,
} from '../../hooks/usePerpsCanPostPosition';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsSharePositionSheetSelectorsIDs } from '../../Perps.testIds';
import type { PerpsModalsNavigationParamList } from '../../types/navigation';
import { PERPS_SHARE_POSITION_INTERACTION_TYPE } from './PerpsSharePositionView.constants';

const PerpsSharePositionView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { params } =
    useRoute<RouteProp<PerpsModalsNavigationParamList, 'PerpsSharePosition'>>();
  const { position, marketPrice, socialPosition } = params;
  const sheetRef = useRef<BottomSheetRef>(null);
  const hasSelectedOptionRef = useRef(false);
  const { openComposer } = useOpenSocialPostComposer();
  const direction = getPerpsShareDirection(position);

  useEffect(() => {
    if (socialPosition || hasSelectedOptionRef.current) {
      return;
    }
    navigation.dispatch(
      StackActions.replace(Routes.PERPS.PNL_HERO_CARD, {
        position,
        marketPrice,
      }),
    );
  }, [marketPrice, navigation, position, socialPosition]);

  const eventProperties = useMemo(
    () => ({
      [PERPS_EVENT_PROPERTY.ASSET]: position.symbol,
      [PERPS_EVENT_PROPERTY.DIRECTION]:
        direction === 'long'
          ? PERPS_EVENT_VALUE.DIRECTION.LONG
          : PERPS_EVENT_VALUE.DIRECTION.SHORT,
    }),
    [direction, position.symbol],
  );
  const { track } = usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_UI_INTERACTION,
    properties: {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_SHARE_POSITION_INTERACTION_TYPE.SHEET_DISPLAYED,
      ...eventProperties,
    },
  });

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handlePostToMetaMask = useCallback(() => {
    if (!socialPosition || hasSelectedOptionRef.current) {
      return;
    }
    hasSelectedOptionRef.current = true;
    postPerpsPositionToFeed({
      socialPosition,
      symbol: position.symbol,
      direction,
      track,
      openComposer,
    });
    closeSheet();
  }, [
    closeSheet,
    direction,
    openComposer,
    position.symbol,
    socialPosition,
    track,
  ]);

  const handleShareExternally = useCallback(() => {
    if (hasSelectedOptionRef.current) {
      return;
    }
    hasSelectedOptionRef.current = true;
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_SHARE_POSITION_INTERACTION_TYPE.SHARE_EXTERNALLY,
      ...eventProperties,
    });
    navigation.dispatch(
      StackActions.replace(Routes.PERPS.PNL_HERO_CARD, {
        position,
        marketPrice,
      }),
    );
  }, [eventProperties, marketPrice, navigation, position, track]);

  const chevron = (
    <Icon
      name={IconName.ArrowRight}
      size={IconSize.Md}
      color={IconColor.IconAlternative}
    />
  );

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      testID={PerpsSharePositionSheetSelectorsIDs.SHEET}
    >
      <BottomSheetHeader onClose={closeSheet}>
        {strings('perps.share_position.title')}
      </BottomSheetHeader>
      <ListItem
        isInteractive
        avatar={<Foxicon variant={FoxiconVariant.Base} size={24} />}
        title={strings('perps.share_position.post_to_metamask')}
        titleEndAccessory={
          <Tag severity={TagSeverity.Info}>
            {strings('perps.share_position.new_badge')}
          </Tag>
        }
        description={strings(
          'perps.share_position.post_to_metamask_description',
        )}
        endAccessory={chevron}
        accessoryGap={2}
        onPress={handlePostToMetaMask}
        testID={PerpsSharePositionSheetSelectorsIDs.POST_TO_METAMASK}
      />
      <ListItem
        isInteractive
        avatar={
          <Icon
            name={IconName.Share}
            size={IconSize.Lg}
            color={IconColor.IconDefault}
          />
        }
        title={strings('perps.share_position.share_externally')}
        endAccessory={chevron}
        accessoryGap={2}
        onPress={handleShareExternally}
        testID={PerpsSharePositionSheetSelectorsIDs.SHARE_EXTERNALLY}
      />
    </BottomSheet>
  );
};

export default PerpsSharePositionView;
