import React from 'react';
import {
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { BenefitDetailsViewRouteProp } from './BenefitDetailsView.types.ts';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants.ts';

const BenefitDetailsView = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route = useRoute<BenefitDetailsViewRouteProp>();
  const { colors } = useTheme();

  const { benefit } = route.params;

  const handleClaim = () => {
    if (benefit.url) {
      Linking.openURL(benefit.url);
    }
  };

  return (
    <SafeAreaView
      style={tw.style('flex-1', { backgroundColor: colors.background.default })}
    >
      <StatusBar barStyle="dark-content" />
      <Box twClassName="px-4 py-2 flex-row items-center">
        <ButtonIcon
          size={ButtonIconSize.Md}
          iconName={IconName.ArrowLeft}
          onPress={() => navigation.goBack()}
        />
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 pb-24')}
      >
        <Box twClassName="w-full rounded-lg overflow-hidden">
          <Image
            source={{ uri: benefit.thumbnail }}
            style={tw.style('w-full h-[248px]')}
            resizeMode="cover"
            testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS_IMAGE}
          />
        </Box>

        <Box twClassName="py-6 gap-4">
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            twClassName="text-default"
          >
            {benefit.longTitle}
          </Text>
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {benefit.longDescription}
          </Text>
        </Box>
      </ScrollView>
      <Box twClassName="absolute bottom-0 left-0 right-0 p-4">
        <TouchableOpacity
          onPress={handleClaim}
          activeOpacity={0.8}
          style={[
            tw.style('rounded-2xl py-3 items-center border border-1'),
            { backgroundColor: colors.background.default },
          ]}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            style={{ color: colors.text.default }}
          >
            Claim
          </Text>
        </TouchableOpacity>
      </Box>
    </SafeAreaView>
  );
};

export default BenefitDetailsView;
