import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionDivider,
  SectionHeader,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import type { AssetStackParamList } from '../../../../../Nav/Main/types/navigation';
import { useSecurityTabFacts } from '../../../hooks/useSecurityTabFacts';
import { useTokenSecurityData } from '../../../hooks/useTokenSecurityData';
import type { SecurityReason } from '../../../utils/securityReasons';
import {
  CHECK_OUTCOME_PRESENTATION,
  SECURITY_CHECK_DESCRIPTION_KEYS,
  SECURITY_CHECK_LABEL_KEYS,
  SECURITY_CONTRACT_CHECKS,
} from '../SecurityTab/SecurityTab.constants';
import type {
  ContractCheckKey,
  SecurityCheck,
} from '../SecurityTab/SecurityTab.types';
import SecurityDetailRow from './components/SecurityDetailRow';
import { ContractSecuritySelectors } from './ContractSecurityScreen.testIds';

/**
 * One group of checks, rendered as rows with their definitions printed.
 *
 * `checkKeys` drives the order so the group's membership lives in
 * `SecurityTab.constants` beside the tab's own list, not inside this JSX.
 *
 * The group owns the spacing between its rows as well as the order. A
 * `SectionDivider` sits in each gap, and its default 20px margins give the
 * 20px either side of the rule — so the rows carry no padding and a group ends
 * flush at both edges, leaving the gap to whatever follows it to this section's
 * own padding.
 */
const CheckGroup = ({
  checkKeys,
  checks,
  testID,
  twClassName,
}: {
  checkKeys: readonly ContractCheckKey[];
  checks: Partial<Record<ContractCheckKey, SecurityCheck>>;
  testID: string;
  twClassName?: string;
}) => (
  <Box testID={testID} twClassName={twClassName}>
    {checkKeys.map((checkKey, index) => {
      const check = checks[checkKey];
      const outcome = check?.outcome ?? 'unknown';
      const { icon, valueColor } = CHECK_OUTCOME_PRESENTATION[outcome];

      return (
        <React.Fragment key={checkKey}>
          {index > 0 ? (
            <SectionDivider testID={ContractSecuritySelectors.DIVIDER} />
          ) : null}
          <SecurityDetailRow
            checkKey={checkKey}
            label={strings(SECURITY_CHECK_LABEL_KEYS[checkKey])}
            value={outcome === 'unknown' ? null : (check?.value ?? null)}
            description={strings(SECURITY_CHECK_DESCRIPTION_KEYS[checkKey])}
            icon={icon}
            valueColor={valueColor}
          />
        </React.Fragment>
      );
    })}
  </Box>
);

/**
 * What Blockaid actually found, one line per feature.
 *
 * Replaces three fixed rows that each had to infer a pass from an absent
 * feature. This list only ever states what came back, so it needs no empty
 * state beyond saying so — and an empty list is the common case for a clean
 * token on a chain Blockaid reports little about.
 *
 * One glyph for the whole list rather than per row: every entry shares the
 * token's verdict by construction, since the bucket a reason comes from is
 * chosen by that verdict.
 */
const ReasonList = ({
  reasons,
  isPositive,
}: {
  reasons: readonly SecurityReason[];
  isPositive: boolean;
}) => {
  if (reasons.length === 0) {
    return (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        testID={ContractSecuritySelectors.SECTION_ADDITIONAL}
      >
        {strings('token_details_v1.security_tab.reasons.empty')}
      </Text>
    );
  }

  return (
    <Box
      twClassName="gap-3"
      testID={ContractSecuritySelectors.SECTION_ADDITIONAL}
    >
      {reasons.map((reason) => (
        <Box
          key={reason.featureId}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
          testID={ContractSecuritySelectors.reason(reason.featureId)}
        >
          <Icon
            name={isPositive ? IconName.CheckBold : IconName.Danger}
            size={IconSize.Sm}
            color={
              isPositive ? IconColor.SuccessDefault : IconColor.ErrorDefault
            }
          />
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {reason.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

/**
 * Contract security screen — the Security tab's Contract heading, expanded.
 *
 * Repeats the tab's four contract checks with their definitions printed under
 * each row instead of hidden behind a dotted underline, then lists what
 * Blockaid actually found.
 *
 * A pushed screen rather than a sheet because the content runs past a phone
 * screen: four rows each carrying a sentence, plus an open-ended list of
 * findings, does not fit the height a `BottomSheet` can offer without becoming
 * a scroll-within-a-scroll.
 */
export const ContractSecurityScreen: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();
  const { token } =
    useRoute<RouteProp<AssetStackParamList, 'ContractSecurity'>>().params;

  /**
   * The tab hands its resolved payload over on `token.securityData`, so the
   * common path — tapping the Contract heading — resolves without a request.
   * The fetch is the fallback for a deep link that arrives here cold.
   */
  const { securityData, isLoading, error } = useTokenSecurityData({
    assetId: token.caipAssetId ?? null,
    prefetchedData: token.securityData,
  });

  const facts = useSecurityTabFacts({ securityData, isLoading, error });

  /**
   * `paddingTop` is the prototype's 20px. The 24px bottom is its `pb-6` plus
   * the home-indicator inset, so the last row clears the gesture area rather
   * than ending flush against it.
   */
  const scrollContentStyle = React.useMemo(
    () => ({ paddingTop: 20, paddingBottom: insets.bottom + 24 }),
    [insets.bottom],
  );

  const handleBack = React.useCallback(() => navigation.goBack(), [navigation]);

  return (
    <View
      style={tw.style('flex-1 bg-default')}
      testID={ContractSecuritySelectors.SCREEN}
    >
      {/* Title sits beside the back button rather than centred between it and
          a spacer, which is how the prototype draws it.

          `pb-2` and the scroll view's 20px together make the 28px the
          prototype leaves between the header and the first row. */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3 px-4 pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={strings('navigation.back')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          testID={ContractSecuritySelectors.BACK_BUTTON}
        >
          <Icon
            name={IconName.ArrowLeft}
            size={IconSize.Md}
            color={IconColor.IconDefault}
          />
        </TouchableOpacity>
        <Text
          variant={TextVariant.HeadingMd}
          color={TextColor.TextDefault}
          accessibilityRole="header"
          testID={ContractSecuritySelectors.TITLE}
        >
          {strings('token_details_v1.contract_security.title')}
        </Text>
      </Box>

      <ScrollView
        style={tw.style('flex-1')}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollContentStyle}
      >
        <Box twClassName="px-4">
          {/* The four contract checks carry no heading of their own: the screen
              title already names them, and a second "Contract" immediately
              under it would read as a nested section. */}
          <CheckGroup
            checkKeys={SECURITY_CONTRACT_CHECKS}
            checks={facts.checks}
            testID={ContractSecuritySelectors.SECTION_CONTRACT}
            twClassName="pb-6"
          />

          {/* The rule between the two groups belongs to this section, not to
              the row above it — which is why the last row of each group draws
              nothing. */}
          <Box twClassName="border-t border-muted pt-6">
            {/* Same `px-0` cancellation and header role as the tab's titles:
                the screen pads itself, and this is the one heading a screen
                reader can use to skip past the four contract checks.

                The type is `SectionHeader`'s own default, which resolves to
                20px/600 on a 24px line — what the prototype's heading measures
                — so there is nothing to override. */}
            <SectionHeader
              title={strings(
                'token_details_v1.security_tab.sections.additional_checks',
              )}
              titleProps={{ accessibilityRole: 'header' }}
              twClassName="px-0 pb-5 pt-0"
            />
            <ReasonList
              reasons={facts.reasons}
              isPositive={facts.verdict === 'screened'}
            />
          </Box>

          {/* Same provenance line as the tab, for the same reason: every row
              above came from a third-party scan that may be hours old. */}
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="pt-6"
            testID={ContractSecuritySelectors.SCAN_META}
          >
            {facts.checkedMinutesAgo === null
              ? strings('token_details_v1.security_tab.checks_meta.attribution')
              : strings(
                  'token_details_v1.security_tab.checks_meta.attribution_checked',
                  { count: facts.checkedMinutesAgo },
                )}
          </Text>
        </Box>
      </ScrollView>
    </View>
  );
};

export default ContractSecurityScreen;
