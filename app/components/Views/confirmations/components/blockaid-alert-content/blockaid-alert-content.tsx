import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { deflate } from 'react-native-gzip';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import { BLOCKAID_SUPPORTED_NETWORK_NAMES } from '../../../../../util/networks';
import { WALLET_CONNECT_ORIGIN } from '../../../../../util/walletconnect';
import {
  FALSE_POSITIVE_REPORT_BASE_URL,
  UTM_SOURCE,
} from '../../../../../constants/urls';
import { DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT } from '../../../../../component-library/components/Banners/Banner/foundation/BannerBase/BannerBase.constants';
import Accordion, {
  AccordionHeaderHorizontalAlignment,
} from '../../../../../component-library/components/Accordions/Accordion';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
// TODO: Remove legacy import
import BlockaidBannerLink from '../../legacy/components/BlockaidBanner/BlockaidBannerLink';
import {
  FALSE_POSITIVE_REPOST_LINE_TEST_ID,
  REASON_DESCRIPTION_I18N_KEY_MAP,
} from '../../legacy/components/BlockaidBanner/BlockaidBanner.constants';
import {
  Reason,
  SecurityAlertResponse,
} from '../../legacy/components/BlockaidBanner/BlockaidBanner.types';
import styleSheet from './blockaid-alert-content.styles';

interface BlockaidAlertContentProps {
  alertDetails?: string[];
  securityAlertResponse: SecurityAlertResponse;
  onContactUsClicked: () => void;
}

const getReportUrl = (encodedData: string) =>
  `${FALSE_POSITIVE_REPORT_BASE_URL}?data=${encodeURIComponent(
    encodedData.toString(),
  )}&utm_source=${UTM_SOURCE}`;

const BlockaidAlertContent: React.FC<BlockaidAlertContentProps> = ({
  alertDetails,
  securityAlertResponse,
  onContactUsClicked,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reportUrl, setReportUrl] = useState<string>('');
  const { styles } = useStyles(styleSheet, {});

  const onToggleShowDetails = () => {
    setIsExpanded(!isExpanded);
  };

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
      if (isExpanded) {
        setReportUrl(getReportUrl(compressed));
      }
    })();
  }, [securityAlertResponse, isExpanded]);

  return (
    <>
      <Text variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}>
        {strings(
          REASON_DESCRIPTION_I18N_KEY_MAP[
            securityAlertResponse.reason as Reason
          ] ?? 'blockaid_banner.other_description',
        )}
      </Text>
      <Accordion
        title={strings('blockaid_banner.see_details')}
        onPress={onToggleShowDetails}
        isExpanded={isExpanded}
        horizontalAlignment={AccordionHeaderHorizontalAlignment.Start}
      >
        <View style={styles.details}>
          {alertDetails?.map((feature, i) => (
            <Text key={`details-${i}`} style={styles.detailsItem}>
              {'• ' + feature}
            </Text>
          ))}
        </View>
        <View style={styles.attributionBase}>
          <Text
            variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}
            data-testid={FALSE_POSITIVE_REPOST_LINE_TEST_ID}
          >
            {strings('blockaid_banner.does_not_look_right')}
          </Text>
          <BlockaidBannerLink
            text={strings('blockaid_banner.report_an_issue')}
            link={reportUrl}
            onContactUsClicked={onContactUsClicked}
          />
        </View>
      </Accordion>
    </>
  );
};

export default BlockaidAlertContent;
