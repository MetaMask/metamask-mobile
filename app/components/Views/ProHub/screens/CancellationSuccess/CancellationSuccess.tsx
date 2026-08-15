import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { CancellationSuccessTestIds } from './CancellationSuccess.testIds';
import { MOCK_CANCELLATION_END_DATE } from './CancellationSuccess.constants';

const CancellationSuccess = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { top } = useSafeAreaInsets();

  const handleDone = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.ROOT as never);
  }, [navigation]);

  return (
    <View
      style={[tw.style('flex-1 bg-background-default'), { paddingTop: top }]}
      testID={CancellationSuccessTestIds.CONTAINER}
    >
      {/* ── Centered content ──────────────────────────────────────────────── */}
      <Box twClassName="flex-1 items-center justify-center px-8 gap-y-6">
        {/* Check icon badge */}
        <Box
          twClassName="w-16 h-16 bg-background-section rounded-2xl items-center justify-center"
          testID={CancellationSuccessTestIds.CHECK_ICON_BOX}
        >
          <Icon
            name={IconName.Check}
            size={IconSize.Lg}
            color={IconColor.IconDefault}
          />
        </Box>

        {/* Title */}
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          twClassName="text-center"
          testID={CancellationSuccessTestIds.TITLE}
        >
          {strings('pro_hub.cancellation_success.title')}
        </Text>

        {/* Description — description_prefix + bold date + description_suffix */}
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={CancellationSuccessTestIds.DESCRIPTION}
        >
          {strings('pro_hub.cancellation_success.description_prefix')}
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {MOCK_CANCELLATION_END_DATE}
          </Text>
          {strings('pro_hub.cancellation_success.description_suffix')}
        </Text>
      </Box>

      {/* ── Done button ───────────────────────────────────────────────────── */}
      <Box twClassName="px-4 pb-6 w-full">
        <Button
          variant={ButtonVariant.Primary}
          onPress={handleDone}
          testID={CancellationSuccessTestIds.DONE_BUTTON}
          isFullWidth
          size={ButtonSize.Lg}
        >
          {strings('pro_hub.cancellation_success.done')}
        </Button>
      </Box>
    </View>
  );
};

export default CancellationSuccess;
