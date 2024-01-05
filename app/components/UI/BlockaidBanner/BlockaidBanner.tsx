import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { View } from 'react-native-animatable';
import { captureException } from '@sentry/react-native';
import { deflate } from 'react-native-gzip';

import { strings } from '../../../../locales/i18n';
import { AccordionHeaderHorizontalAlignment } from '../../../component-library/components/Accordions/Accordion';
import Accordion from '../../../component-library/components/Accordions/Accordion/Accordion';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT } from '../../../component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.constants';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Icon from '../../../component-library/components/Icons/Icon/Icon';
import Text from '../../../component-library/components/Texts/Text/Text';
import { useStyles } from '../../../component-library/hooks/useStyles';
import { isBlockaidFeatureEnabled } from '../../../util/blockaid';
import { NETWORK_NAMES } from '../../../constants/network';
import {
  ATTRIBUTION_LINE_TEST_ID,
  FALSE_POSITIVE_REPOST_LINE_TEST_ID,
  REASON_DESCRIPTION_I18N_KEY_MAP,
  REASON_TITLE_I18N_KEY_MAP,
} from './BlockaidBanner.constants';
import styleSheet from './BlockaidBanner.styles';
import {
  BlockaidBannerProps,
  Reason,
  ResultType,
} from './BlockaidBanner.types';
import BlockaidBannerLink from './BlockaidBannerLink';
import {
  BLOCKAID_ATTRIBUTION_LINK,
  FALSE_POSITIVE_REPORT_BASE_URL,
  UTM_SOURCE,
} from '../../../constants/urls';
import { isMainnetByChainId } from '../../../util/networks';
import { selectIsSecurityAlertsEnabled } from '../../../selectors/preferencesController';
import BlockaidVersionInfo from '../../../lib/ppom/blockaid-version';

const getReportUrl = (encodedData: string) =>
  `${FALSE_POSITIVE_REPORT_BASE_URL}?data=${encodeURIComponent(
    encodedData.toString(),
  )}&utm_source=${UTM_SOURCE}`;

const getTitle = (reason: Reason): string =>
  strings(
    REASON_TITLE_I18N_KEY_MAP[reason] ||
      'blockaid_banner.deceptive_request_title',
  );

const getDescription = (reason: Reason) =>
  strings(
    REASON_DESCRIPTION_I18N_KEY_MAP[reason] ||
      REASON_DESCRIPTION_I18N_KEY_MAP[Reason.other],
  );

const Attribution = ({ styles }: { styles: Record<string, any> }) => (
  <View style={styles.attributionBase}>
    <View style={styles.attributionItem}>
      <Icon
        name={IconName.SecurityTick}
        size={IconSize.Sm}
        color={IconColor.Primary}
        style={styles.securityTickIcon}
      />
    </View>
    <View style={styles.attributionItem}>
      <Text
        variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}
        data-testid={ATTRIBUTION_LINE_TEST_ID}
      >
        {strings('blockaid_banner.attribution')}
      </Text>
    </View>
    <View style={styles.attributionItem}>
      <BlockaidBannerLink
        text={strings('blockaid_banner.attribution_link_name')}
        link={BLOCKAID_ATTRIBUTION_LINK}
      />
    </View>
  </View>
);

const BlockaidBanner = (bannerProps: BlockaidBannerProps) => {
  const {
    style,
    securityAlertResponse,
    onToggleShowDetails,
    onContactUsClicked,
  } = bannerProps;
  const { styles, theme } = useStyles(styleSheet, { style });
  const [displayPositiveResponse, setDisplayPositiveResponse] = useState(false);
  const [reportUrl, setReportUrl] = useState<string>('');
  const isSecurityAlertsEnabled = useSelector(selectIsSecurityAlertsEnabled);

  useEffect(() => {
    if (securityAlertResponse?.reason === Reason.requestInProgress) {
      setDisplayPositiveResponse(true);
    }
  }, [securityAlertResponse]);

  useEffect(() => {
    if (!securityAlertResponse) {
      return;
    }
    const { result_type, reason, features, block, req, chainId } =
      securityAlertResponse;

    if (!req) {
      return;
    }

    const reportData = {
      domain: req.origin,
      jsonRpcMethod: req.method,
      jsonRpcParams: JSON.stringify(req.params),
      blockNumber: block,
      chain: NETWORK_NAMES[chainId],
      classification: reason,
      resultType: result_type,
      reproduce: JSON.stringify(features),
      blockaidVersion: BlockaidVersionInfo.BlockaidVersion,
    };

    (async () => {
      const compressed = await deflate(JSON.stringify(reportData));
      setReportUrl(getReportUrl(compressed));
    })();
  }, [securityAlertResponse]);

  if (
    !securityAlertResponse ||
    !isBlockaidFeatureEnabled() ||
    !isSecurityAlertsEnabled
  ) {
    return null;
  }

  const { result_type, reason, features, chainId } = securityAlertResponse;

  if (!isMainnetByChainId(chainId)) {
    return null;
  }

  if (securityAlertResponse.reason === Reason.requestInProgress) {
    return (
      <View style={styles.bannerWrapperMargined}>
        <BannerAlert
          severity={BannerAlertSeverity.Warning}
          title={strings('blockaid_banner.loading_title')}
          startAccessory={
            <ActivityIndicator
              size="small"
              color={theme.colors.warning.default}
            />
          }
        >
          <Attribution styles={styles} />
        </BannerAlert>
      </View>
    );
  }

  if (result_type === ResultType.Benign) {
    if (displayPositiveResponse) {
      return (
        <View style={styles.bannerWrapperMargined}>
          <BannerAlert
            severity={BannerAlertSeverity.Info}
            title={strings('blockaid_banner.loading_complete_title')}
            onClose={() => {
              setDisplayPositiveResponse(false);
            }}
          >
            <Attribution styles={styles} />
          </BannerAlert>
        </View>
      );
    }
    return null;
  }

  const title = getTitle(reason);
  const description = getDescription(reason);

  if (result_type === ResultType.Failed) {
    return (
      <View style={styles.bannerWrapperMargined}>
        <BannerAlert
          severity={BannerAlertSeverity.Warning}
          title={title}
          description={description}
        />
      </View>
    );
  }

  if (!REASON_DESCRIPTION_I18N_KEY_MAP[reason]) {
    captureException(`BlockaidBannerAlert: Unidentified reason '${reason}'`);
  }

  const renderDetails = () =>
    features?.length && features?.length <= 0 ? null : (
      <Accordion
        title={strings('blockaid_banner.see_details')}
        onPress={onToggleShowDetails}
        isExpanded={false}
        horizontalAlignment={AccordionHeaderHorizontalAlignment.Start}
      >
        <View style={styles.details}>
          {features?.map((feature, i) => (
            <Text key={`feature-${i}`} style={styles.detailsItem}>
              • {JSON.stringify(feature)}
            </Text>
          ))}
        </View>
        <View style={styles.attributionBase}>
          <View style={styles.attributionItem}>
            <Text
              variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}
              data-testid={FALSE_POSITIVE_REPOST_LINE_TEST_ID}
            >
              {strings('blockaid_banner.does_not_look_right')}
            </Text>
          </View>
          <View style={styles.attributionItem}>
            <BlockaidBannerLink
              text={strings('blockaid_banner.report_an_issue')}
              link={reportUrl}
              onContactUsClicked={onContactUsClicked}
            />
          </View>
        </View>
      </Accordion>
    );

  return (
    <BannerAlert
      severity={
        result_type === ResultType.Malicious
          ? BannerAlertSeverity.Error
          : BannerAlertSeverity.Warning
      }
      title={title}
      description={description}
      {...bannerProps}
    >
      {renderDetails()}
      <Attribution styles={styles} />
    </BannerAlert>
  );
};

export default BlockaidBanner;
