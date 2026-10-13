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
  FontWeight,
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
import { useSecurityFacts } from '../../../hooks/useSecurityFacts';
import SecurityAttribution, {
  SECURITY_ATTRIBUTION_EXPLAINER,
} from '../SecurityAttribution/SecurityAttribution';
import TokenExplainerSheet from '../TokenExplainerSheet/TokenExplainerSheet';
import { useElapsedMinutes } from '../../../hooks/useElapsedMinutes';
import { useTokenCaipAssetId } from '../../../hooks/useTokenCaipAssetId';
import { useTokenSecurityQuery } from '../../../../Tokens/hooks/useTokenSecurityQuery';
import type { SecurityRisk } from '../../../utils/securityFacts';
import {
  checkDescriptionKey,
  checkLabelKey,
  resolveCheckPresentation,
} from '../SecurityTab/SecurityTab.constants';
import {
  CONTRACT_CHECK_KEYS,
  type ContractCheckKey,
  type SecurityCheck,
} from '../SecurityTab/SecurityTab.types';
import SecurityDetailRow from './components/SecurityDetailRow';
import { ContractSecuritySelectors } from './ContractSecurityScreen.testIds';

/**
 * One group of checks, rendered as rows with their definitions printed.
 *
 * `checkKeys` drives the order so the group's membership comes from
 * `CONTRACT_CHECK_KEYS`, which the tab renders from too, rather than this JSX.
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
      const { icon, valueColor } = resolveCheckPresentation(checkKey, outcome);

      return (
        <React.Fragment key={checkKey}>
          {index > 0 ? (
            <SectionDivider testID={ContractSecuritySelectors.DIVIDER} />
          ) : null}
          <SecurityDetailRow
            checkKey={checkKey}
            label={strings(checkLabelKey(checkKey))}
            value={outcome === 'unknown' ? null : (check?.value ?? null)}
            description={strings(checkDescriptionKey(checkKey))}
            icon={icon}
            valueColor={valueColor}
          />
        </React.Fragment>
      );
    })}
  </Box>
);

/**
 * How severe a risk looks: its own glyph, that glyph's colour and its title's,
 * with the description left grey in both so the severity reads from the
 * heading alone.
 *
 * The two severities take different shapes rather than one shape in two
 * colours so the distinction survives without colour: a triangle and a circle
 * stay apart for a reader who cannot tell amber from red (WCAG 1.4.1).
 */
const RISK_PRESENTATION: Record<
  SecurityRisk['severity'],
  { iconName: IconName; icon: IconColor; title: TextColor }
> = {
  malicious: {
    iconName: IconName.Danger,
    icon: IconColor.ErrorDefault,
    title: TextColor.ErrorDefault,
  },
  warning: {
    iconName: IconName.Warning,
    icon: IconColor.WarningDefault,
    title: TextColor.WarningDefault,
  },
};

/**
 * What Blockaid actually found, one row per finding.
 *
 * Shaped like `CheckGroup` above — a `SectionDivider` in each gap, rows
 * carrying no spacing of their own — so the two halves of the screen read as
 * one list. The description sits on its own full-width line rather than
 * indented under the title, per the design.
 *
 * Each row draws its own glyph and tint rather than the list drawing one for
 * all of them. The previous single glyph was only sound while every entry
 * shared the token's verdict by construction; now a token can carry a
 * malicious finding beside a warning one, and the two have to be told apart.
 *
 * No empty state: the caller drops the whole section when nothing was found,
 * which is the common case for a clean token.
 */
const RiskList = ({ risks }: { risks: readonly SecurityRisk[] }) => (
  <Box testID={ContractSecuritySelectors.SECTION_ADDITIONAL}>
    {risks.map((risk, index) => {
      const presentation = RISK_PRESENTATION[risk.severity];

      return (
        <React.Fragment key={risk.id}>
          {index > 0 ? (
            <SectionDivider testID={ContractSecuritySelectors.DIVIDER} />
          ) : null}
          <Box
            twClassName="gap-1"
            testID={ContractSecuritySelectors.risk(risk.id)}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              <Icon
                name={presentation.iconName}
                size={IconSize.Sm}
                color={presentation.icon}
              />
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={presentation.title}
                testID={ContractSecuritySelectors.riskTitle(risk.id)}
              >
                {risk.title}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {risk.description}
            </Text>
          </Box>
        </React.Fragment>
      );
    })}
  </Box>
);

/**
 * Contract security screen — the Security tab's Contract heading, expanded.
 *
 * Repeats the tab's five contract checks with their definitions printed under
 * each row instead of hidden behind a dotted underline, then lists what
 * Blockaid actually found.
 *
 * A pushed screen rather than a sheet because the content runs past a phone
 * screen: five rows each carrying a sentence, plus an open-ended list of
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
   * Resolved the same way the detail page resolves it, so both land on one
   * query entry: this screen is opened from that page and should render from
   * the payload already in cache rather than fetching its own copy.
   */
  const caipAssetId = useTokenCaipAssetId(token);

  const {
    data: securityData,
    isPending: isLoading,
    error,
    dataUpdatedAt,
  } = useTokenSecurityQuery(caipAssetId);

  const facts = useSecurityFacts({
    securityData: securityData ?? null,
    isLoading,
    error,
  });

  // This screen is always the foreground route while mounted, so the clock
  // needs no gate beyond the hook's own AppState check.
  const fetchedMinutesAgo = useElapsedMinutes({
    since: dataUpdatedAt,
    enabled: true,
  });

  const scrollContentStyle = React.useMemo(
    () => ({ paddingTop: 20, paddingBottom: insets.bottom + 24 }),
    [insets.bottom],
  );

  const handleBack = React.useCallback(() => navigation.goBack(), [navigation]);

  /**
   * Whether the provenance disclaimer is open.
   *
   * A boolean rather than the `ExplainerCopy | null` the detail page holds,
   * because this screen prints every definition inline and so has exactly one
   * sheet it can ever open. The sheet still has to mount as a sibling of the
   * `ScrollView` below: the design system `BottomSheet` positions itself
   * `absolute inset-0` against its nearest positioned ancestor rather than
   * through a portal, so one mounted inside the scroll content would be
   * clipped to the viewport and scroll away with the page.
   */
  const [isDisclaimerOpen, setIsDisclaimerOpen] = React.useState(false);

  const handleOpenDisclaimer = React.useCallback(
    () => setIsDisclaimerOpen(true),
    [],
  );
  const handleCloseDisclaimer = React.useCallback(
    () => setIsDisclaimerOpen(false),
    [],
  );

  return (
    <View
      style={tw.style('flex-1 bg-default')}
      testID={ContractSecuritySelectors.SCREEN}
    >
      {/* Title sits beside the back button rather than centred between it and
          a spacer, which is how the prototype draws it.

          `pb-2` and the scroll view's 20px together make the 28px the
          prototype leaves between the screen title and the "Contract checks"
          heading under it. */}
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
          {/* "Contract checks" rather than the tab's "Contract", so the
              heading does not simply repeat the screen title above it. Padded
              exactly like the Additional checks heading below, since the two
              are siblings and the design draws them alike. */}
          <SectionHeader
            title={strings(
              'token_details_v1.security_tab.sections.contract_checks',
            )}
            titleProps={{ accessibilityRole: 'header' }}
            twClassName="px-0 pb-5 pt-0"
          />
          <CheckGroup
            checkKeys={CONTRACT_CHECK_KEYS}
            checks={facts.checks}
            testID={ContractSecuritySelectors.SECTION_CONTRACT}
            twClassName="pb-6"
          />

          {/* The whole section goes when there is nothing to list, rule
              included — an "Additional checks" heading over a blank space
              reads as a loading failure rather than as good news, and the
              checks above have already said the token looks fine.

              The rule between the two groups belongs to this section, not to
              the row above it, which is why the last row of each group draws
              nothing and why dropping the section takes the rule with it. */}
          {facts.risks.length > 0 ? (
            <>
              {/* `-mx-4` cancels the screen's padding so this rule reaches both
                  edges while the rows above and below stay inset, which is how
                  the tab draws the rule between its own sections. The rules
                  inside each group stay inset, since those separate rows rather
                  than sections.

                  `marginVertical={0}` drops the design system's 20px default,
                  leaving the group's `pb-6` above and the heading's `pt-6`
                  below as the only spacing. */}
              <SectionDivider
                marginVertical={0}
                twClassName="-mx-4"
                testID={ContractSecuritySelectors.SECTION_RULE}
              />
              {/* Same `px-0` cancellation and header role as the tab's titles:
                  the screen pads itself, and this is the one heading a screen
                  reader can use to skip past the five contract checks. The
                  overrides work by arriving last in the concatenated class
                  string, which is also how `pt-6` beats the baked `pt-3`.

                  The type is `SectionHeader`'s own default, which resolves to
                  20px/600 on a 24px line — what the prototype's heading
                  measures — so there is nothing to override. */}
              <SectionHeader
                title={strings(
                  'token_details_v1.security_tab.sections.additional_checks',
                )}
                titleProps={{ accessibilityRole: 'header' }}
                twClassName="px-0 pb-5 pt-6"
              />
              <RiskList risks={facts.risks} />
            </>
          ) : null}

          {/* Same provenance line as the tab, for the same reason: every row
              above came from a third-party scan that may be hours old. */}
          <SecurityAttribution
            fetchedMinutesAgo={fetchedMinutesAgo}
            testID={ContractSecuritySelectors.SCAN_META}
            twClassName="pt-6"
            onPress={handleOpenDisclaimer}
          />
        </Box>
      </ScrollView>

      {isDisclaimerOpen ? (
        <TokenExplainerSheet
          title={strings(SECURITY_ATTRIBUTION_EXPLAINER.title)}
          description={strings(SECURITY_ATTRIBUTION_EXPLAINER.description)}
          onClose={handleCloseDisclaimer}
        />
      ) : null}
    </View>
  );
};

export default ContractSecurityScreen;
