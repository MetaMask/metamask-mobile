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
  const { chainId, txIdentifier } = useParams<ActivityDetailsParams>();

  const item = useActivityDetailsItem(txIdentifier, chainId);
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
