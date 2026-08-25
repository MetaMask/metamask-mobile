import React, { useCallback } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  Card,
  HeaderBase,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { ProHubTestIds } from './ProHub.testIds';
import { MOCK_NEXT_PAYMENT, MOCK_PRO_HUB_STATS } from './ProHub.constants';
import PhysicalCardPreview from './components/PhysicalCardPreview';
import { BENEFITS, BenefitRow } from '../shared/pro';

interface StatCardProps {
  iconName: IconName;
  label: string;
  value: string;
  testID: string;
  onPress: () => void;
}

const StatCard = ({
  iconName,
  label,
  value,
  testID,
  onPress,
}: StatCardProps) => {
  const tw = useTailwind();

  const inner = (
    <>
      <Icon name={iconName} size={IconSize.Lg} color={IconColor.IconDefault} />
      <Box twClassName="gap-y-1">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {label}
        </Text>
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
        >
          {value}
        </Text>
      </Box>
    </>
  );

  const card = <Card twClassName={'w-full bg-background-section rounded-2xl p-4 gap-y-10 border-0'}>{inner}</Card>;

  return (
    <Box twClassName="flex-1 min-w-0">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
        style={tw.style('w-full')}
      >
        {card}
      </Pressable>
    </Box>
  );
};

const ProHub = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleManageMembership = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.MEMBERSHIP);
  }, [navigation]);

  const handleGetCard = useCallback(() => {
    navigation.navigate(Routes.CARD.ROOT);
  }, [navigation]);

  const handleEarnedPress = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.EARNED);
  }, [navigation]);

  const handleSavedPress = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.SAVED);
  }, [navigation]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['top', 'bottom']}
      testID={ProHubTestIds.CONTAINER}
    >
      <HeaderBase
        testID={ProHubTestIds.HEADER_ROOT}
        twClassName="px-4"
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onPress={handleBack}
            accessibilityLabel={strings('navigation.back')}
            testID={ProHubTestIds.BACK_BUTTON}
          />
        }
        endAccessory={
          <ButtonIcon
            iconName={IconName.Setting}
            onPress={handleManageMembership}
            accessibilityLabel={strings('pro_hub.manage')}
            testID={ProHubTestIds.MANAGE_PLANS_BUTTON}
          />
        }
      />

      <ScrollView
        contentContainerStyle={tw.style('px-4 pt-2 pb-10')}
        showsVerticalScrollIndicator={false}
      >
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          twClassName="mb-6"
          testID={ProHubTestIds.TITLE}
        >
          {strings('pro_hub.title')}
        </Text>

        <Box flexDirection={BoxFlexDirection.Row} gap={3} twClassName="mb-16">
          <StatCard
            iconName={IconName.Diagram}
            label={strings('pro_hub.earned_with_pro')}
            value={MOCK_PRO_HUB_STATS.earned}
            testID={ProHubTestIds.EARNED_CARD}
            onPress={handleEarnedPress}
          />
          <StatCard
            iconName={IconName.AttachMoney}
            label={strings('pro_hub.saved_with_pro')}
            value={MOCK_PRO_HUB_STATS.saved}
            testID={ProHubTestIds.SAVED_CARD}
            onPress={handleSavedPress}
          />
        </Box>

        <Box twClassName="flex flex-col gap-y-12">
          <PhysicalCardPreview />
          <Box twClassName="flex flex-col items-center justify-center gap-y-2">
            <Text
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
              twClassName="text-center"
              testID={ProHubTestIds.PHYSICAL_CARD_TITLE}
            >
              {strings('pro_hub.physical_card.title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center max-w-[85%]"
              testID={ProHubTestIds.PHYSICAL_CARD_DESCRIPTION}
            >
              {strings('pro_hub.physical_card.description')}
            </Text>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Md}
              onPress={handleGetCard}
              testID={ProHubTestIds.GET_CARD_BUTTON}
              twClassName="mx-auto mt-1"
            >
              {strings('pro_hub.physical_card.cta')}
            </Button>
          </Box>
        </Box>

        <SectionDivider marginVertical={6} />

        <Box testID={ProHubTestIds.BENEFITS_SECTION}>
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {strings('pro_hub.your_benefits')}
          </Text>
          {BENEFITS.map((item) => (
            <BenefitRow key={item.id} item={item} showArrow={false} />
          ))}
        </Box>

        <SectionDivider marginVertical={6} />

        <Box testID={ProHubTestIds.MEMBERSHIP_SECTION} twClassName="gap-y-4">
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {strings('pro_hub.membership.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={ProHubTestIds.NEXT_PAYMENT_TEXT}
          >
            {strings('pro_hub.next_payment', {
              amount: MOCK_NEXT_PAYMENT.amount,
              date: MOCK_NEXT_PAYMENT.date,
            })}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleManageMembership}
            isFullWidth
            testID={ProHubTestIds.MANAGE_BUTTON}
          >
            {strings('pro_hub.manage_plan')}
          </Button>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProHub;
