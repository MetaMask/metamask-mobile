import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { View } from 'react-native-animatable';
import { captureException } from '@sentry/react-native';
import { deflate } from 'react-native-gzip';

import { strings } from '../../../../../../locales/i18n';
import { AccordionHeaderHorizontalAlignment } from '../../../../../component-library/components/Accordions/Accordion';
import Accordion from '../../../../../component-library/components/Accordions/Accordion/Accordion';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner';
import { DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT } from '../../../../../component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.constants';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import Text from '../../../../../component-library/components/Texts/Text/Text';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import {
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
  FALSE_POSITIVE_REPORT_BASE_URL,
  UTM_SOURCE,
} from '../../../../../constants/urls';
import { BLOCKAID_SUPPORTED_NETWORK_NAMES } from '../../../../../util/networks';
import { WALLET_CONNECT_ORIGIN } from '../../../../../util/walletconnect';
import AppConstants from '../../../../../core/AppConstants';
import { ConfirmationTopSheetSelectorsIDs } from '../../../ConfirmationView.testIds';

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

const BlockaidBanner = (bannerProps: BlockaidBannerProps) => {
  const {
    style,
    securityAlertResponse,
    onToggleShowDetails,
    onContactUsClicked,
  } = bannerProps;
  const { styles, theme } = useStyles(styleSheet, { style });
  const [reportUrl, setReportUrl] = useState<string>('');

  useEffect(() => {
    if (!securityAlertResponse) {
      return;
    }
    const { result_type, reason, features, block, req, chainId } =
      securityAlertResponse;

    if (!req || !chainId) {
      return;
    }

    const domain = req.origin as string;

    const reportData = {
      domain: domain
        ?.replace(WALLET_CONNECT_ORIGIN, '')
        ?.replace(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN, ''),
      jsonRpcMethod: req.method,
      jsonRpcParams: JSON.stringify(req.params),
      blockNumber: block,
      chain: BLOCKAID_SUPPORTED_NETWORK_NAMES[chainId],
      classification: reason,
      resultType: result_type,
      reproduce: JSON.stringify(features),
    };

    (async () => {
      const compressed = await deflate(JSON.stringify(reportData));
      setReportUrl(getReportUrl(compressed));
    })();
  }, [securityAlertResponse]);

  if (!securityAlertResponse) {
    return null;
  }

  const { result_type, reason, features } = securityAlertResponse;

  if (securityAlertResponse.reason === Reason.requestInProgress) {
    return (
      <ActivityIndicator
        style={styles.bannerSectionSmall}
        size="small"
        color={theme.colors.warning.default}
      />
    );
  }

  if (result_type === ResultType.Benign) {
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
          testID={
            ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_RESPONSE_FAILED_BANNER
          }
        />
      </View>
    );
  }

  if (!REASON_DESCRIPTION_I18N_KEY_MAP[reason]) {
    const unidentifiedReasonError = new Error(
      `BlockaidBannerAlert: Unidentified reason '${reason}'`,
    );
    captureException(unidentifiedReasonError);
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
      testID={ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER}
    >
      {renderDetails()}
    </BannerAlert>
  );
};

export default BlockaidBanner;
