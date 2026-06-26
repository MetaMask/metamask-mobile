import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { useParams } from '../../../util/navigation/navUtils';
import { resolveActivityListItemTitle } from '../../UI/ActivityListItemRow/ActivityListItemRow';
// eslint-disable-next-line import-x/no-restricted-paths -- transient row hand-off from the activity list; route-isolation backlog
import { getPreloadedActivityItem } from '../ActivityList/preloadedActivityItemStore';
import { ActivityDetailsSelectorsIDs } from './ActivityDetails.testIds';
import type { ActivityDetailsParams } from './ActivityDetails.types';
import { useActivityDetailsItem } from './hooks/useActivityDetailsItem';
import { TemplateLoader } from './templates/TemplateLoader';

/**
 * Redesigned activity details screen. Re-resolves the {@link ActivityListItem}
 * from the `{ chainId, txIdentifier }` route params (mirroring the extension's
 * `ui/pages/details` flow), then dispatches to a per-type template via
 * `TemplateLoader`. Gated behind `selectIsTransactionsRedesignEnabled` at the
 * navigation call site.
 */
const ActivityDetails = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { chainId, txIdentifier, preloadKey } =
    useParams<ActivityDetailsParams>();
  // Provider-backed rows (Perps / Predict) are handed off via a transient store
  // keyed by `preloadKey`, so route params stay serializable.
  const preloadedItem = getPreloadedActivityItem(preloadKey);

  const item = useActivityDetailsItem(txIdentifier, chainId, preloadedItem);
  const title = item
    ? resolveActivityListItemTitle(item)
    : strings('activity_details.not_found');

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={ActivityDetailsSelectorsIDs.SCREEN}
    >
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          testID={ActivityDetailsSelectorsIDs.HEADER}
          includesTopInset
          title={title}
          onBack={handleBack}
          backButtonProps={{
            testID: ActivityDetailsSelectorsIDs.BACK_BUTTON,
          }}
        />

        {item ? (
          <ScrollView
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style('grow p-4')}
          >
            <TemplateLoader item={item} />
          </ScrollView>
        ) : (
          <Box twClassName="flex-1 items-center justify-center p-4">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={ActivityDetailsSelectorsIDs.NOT_FOUND}
            >
              {strings('activity_details.not_found')}
            </Text>
          </Box>
        )}
      </Box>
    </SafeAreaView>
  );
};

export default ActivityDetails;
