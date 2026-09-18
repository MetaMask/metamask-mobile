import React, { useCallback, useMemo } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  HeaderBase,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  ORANGE_GRADIENT_COLORS,
  ORANGE_GRADIENT_END,
  ORANGE_GRADIENT_START,
} from '../../../shared/pro/brand.constants';
import { MembershipTestIds } from './Membership.testIds';
import {
  MOCK_PAYMENT_DETAILS,
  buildMembershipRows,
  type MembershipAction,
  type MembershipRow,
} from './Membership.constants';
import { useNativeHeader } from '../../../../hooks/useNativeHeader';

interface MembershipListRowProps {
  row: MembershipRow;
  onAction: (action: MembershipAction) => void;
}

/**
 * One row of the billing list.
 *
 * icon | label | value | chevron — the same grammar as the hub's benefit rows,
 * so the two screens read as parts of one product rather than two layouts. A
 * row can carry both a value and a chevron, which is what lets the payment
 * method state what it is and offer to change it in the same place.
 *
 * The icon platter is hand-rolled rather than `AvatarIcon` on purpose:
 * `AvatarIcon`'s severity backgrounds are opaque tokens, and these sit on the
 * brand gradient, which has to read through. `bg-muted` is translucent, and it
 * matches the Secondary buttons below.
 */
const MembershipListRow = ({ row, onAction }: MembershipListRowProps) => {
  const {
    id,
    iconName,
    labelKey,
    labelParams,
    badge,
    value,
    sublabelKey,
    sublabelParams,
    action,
  } = row;

  const handlePress = useCallback(() => {
    if (action) {
      onAction(action);
    }
  }, [action, onAction]);

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="gap-x-3 py-3"
      testID={MembershipTestIds.ROW(id)}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1 gap-x-3"
      >
        <Box twClassName="w-10 h-10 rounded-full bg-muted items-center justify-center shrink-0">
          <Icon
            name={iconName}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>

        <Box twClassName="flex-1 gap-y-0.5">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {strings(labelKey, labelParams)}
          </Text>

          {sublabelKey ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
              testID={MembershipTestIds.SUBLABEL(id)}
            >
              {strings(sublabelKey, sublabelParams)}
            </Text>
          ) : null}
        </Box>
      </Box>

      {/*
        The trailing column stacks: the value, then the badge beneath it. The
        badge qualifies the price, so it belongs under the price rather than
        beside the label, where it competed with it.
      */}
      <Box alignItems={BoxAlignItems.End} twClassName="gap-y-1 shrink-0">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-x-1"
        >
          {value ? (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              testID={MembershipTestIds.VALUE(id)}
            >
              {value}
            </Text>
          ) : null}
          {action ? (
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          ) : null}
        </Box>
        {badge ? (
          <Tag
            severity={TagSeverity.Success}
            testID={MembershipTestIds.BADGE(id)}
          >
            {badge}
          </Tag>
        ) : null}
      </Box>
    </Box>
  );

  if (!action) {
    return content;
  }

  return (
    <TouchableOpacity onPress={handlePress} accessibilityRole="button">
      {content}
    </TouchableOpacity>
  );
};

/**
 * Billing and admin for an Orange membership.
 *
 * "Earned this month" and "Saved this month" were removed. Both figures are now
 * stated by the hub row that produces them — Boosted APY and Card cashback —
 * so here they were duplicates, and each needed an info sheet to explain a
 * number the member had not asked for. Removing them also retired
 * `StatInfoSheet` and its four locale keys.
 */
const Membership = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  const rows = useMemo(() => buildMembershipRows(MOCK_PAYMENT_DETAILS), []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleContactSupport = useCallback(() => {
    // TODO: no support destination exists anywhere in the app yet.
  }, []);

  const handleCancelMembership = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.CANCEL_MEMBERSHIP);
  }, [navigation]);

  const handleAction = useCallback((_action: MembershipAction) => {
    /*
     * `payment_method` and `invoices` have no destination yet — invoices is in
     * flight upstream. Both rows are here because this is where they belong;
     * wire them when there is somewhere to go.
     */
  }, []);

  const isNativeHeaderEnabled = useNativeHeader({
    title: strings('pro_hub.membership.title'),
  });

  return (
    /* Gradient at the container, matching the hub and the upsell. */
    <LinearGradient
      colors={ORANGE_GRADIENT_COLORS}
      start={ORANGE_GRADIENT_START}
      end={ORANGE_GRADIENT_END}
      style={tw.style('flex-1')}
    >
      <SafeAreaView
        style={tw.style('flex-1')}
        edges={isNativeHeaderEnabled ? ['bottom'] : ['top', 'bottom']}
        testID={MembershipTestIds.CONTAINER}
      >
        {/*
          The title sits in the toolbar rather than as a display heading in the
          content. There are three rows on this screen — a 32pt headline over
          them claimed more importance than a billing list deserves.
        */}
        {!isNativeHeaderEnabled && (
          <HeaderBase
            twClassName="px-4"
            startAccessory={
              <ButtonIcon
                iconName={IconName.ArrowLeft}
                onPress={handleBack}
                accessibilityLabel={strings('navigation.back')}
                testID={MembershipTestIds.BACK_BUTTON}
              />
            }
            testID={MembershipTestIds.TITLE}
          >
            {strings('pro_hub.membership.title')}
          </HeaderBase>
        )}

        <ScrollView
          contentInsetAdjustmentBehavior={
            isNativeHeaderEnabled ? 'automatic' : undefined
          }
          contentContainerStyle={tw.style('px-4 pt-2 pb-6')}
          showsVerticalScrollIndicator={false}
        >
          <Box testID={MembershipTestIds.LIST}>
            {rows.map((row) => (
              <MembershipListRow
                key={row.id}
                row={row}
                onAction={handleAction}
              />
            ))}
          </Box>
        </ScrollView>

        {/*
          Support and cancellation are actions, not list items, so they are
          buttons — and pinned, so cancelling is always reachable without
          scrolling a list looking for it. Danger on the cancel keeps them
          visually distinct from each other without needing a divider.
        */}
        <Box twClassName="px-4 pb-2 gap-y-3">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleContactSupport}
            isFullWidth
            testID={MembershipTestIds.CONTACT_SUPPORT_BUTTON}
          >
            {strings('pro_hub.membership.contact_support')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isDanger
            onPress={handleCancelMembership}
            isFullWidth
            testID={MembershipTestIds.CANCEL_MEMBERSHIP_BUTTON}
          >
            {strings('pro_hub.membership.cancel_membership')}
          </Button>
        </Box>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default Membership;
