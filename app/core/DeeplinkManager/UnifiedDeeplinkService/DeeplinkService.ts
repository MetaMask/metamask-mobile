import { NavigationProp, ParamListBase } from '@react-navigation/native';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import { ActionRegistry, DeeplinkParams } from './ActionRegistry';
import { DeeplinkParser, ParsedDeeplink } from './DeeplinkParser';
import {
  verifyDeeplinkSignature,
  VALID,
  INVALID,
  MISSING,
} from '../ParseManager/utils/verifySignature';
import handleDeepLinkModalDisplay from '../Handlers/handleDeepLinkModalDisplay';
import { DeepLinkModalLinkType } from '../../../components/UI/DeepLinkModal';
import { capitalize } from '../../../util/general';
import { ACTIONS, PROTOCOLS } from '../../../constants/deeplinks';
import AppConstants from '../../AppConstants';

export interface DeeplinkServiceOptions {
  navigation?: NavigationProp<ParamListBase>;
  browserCallBack?: (url: string) => void;
  origin?: string;
  onHandled?: () => void;
}

export interface DeeplinkResult {
  success: boolean;
  action?: string;
  error?: string;
  shouldProceed?: boolean;
}

/**
 * DeeplinkService is the unified service for handling all deeplinks.
 * It eliminates duplication between traditional and universal deeplink handling.
 */
export class DeeplinkService {
  private static instance: DeeplinkService;
  private actionRegistry: ActionRegistry;
  private deeplinkParser: DeeplinkParser;

  // Whitelist of actions that should not show the deeplink modal
  private readonly WHITELISTED_ACTIONS = [ACTIONS.WC];

  // Interstitial whitelist for specific URLs
  private readonly interstitialWhitelist = [
    `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.PERPS_ASSET}`,
  ];

  private constructor() {
    this.actionRegistry = ActionRegistry.getInstance();
    this.deeplinkParser = DeeplinkParser.getInstance();
  }

  static getInstance(): DeeplinkService {
    if (!DeeplinkService.instance) {
      DeeplinkService.instance = new DeeplinkService();
    }
    return DeeplinkService.instance;
  }

  /**
   * Parse and handle a deeplink URL
   */
  async handleDeeplink(
    url: string,
    options: DeeplinkServiceOptions = {},
  ): Promise<DeeplinkResult> {
    const { navigation, browserCallBack, origin, onHandled } = options;

    try {
      DevLogger.log('DeeplinkService: Handling deeplink:', url);

      // Parse the deeplink
      const parsed = this.deeplinkParser.parse(url);

      // Validate the parsed deeplink
      const validation = this.deeplinkParser.validate(parsed);

      // For universal links, we still show modal even if validation fails
      // (to match original behavior)
      if (!validation.isValid && !parsed.isUniversalLink) {
        DevLogger.log('DeeplinkService: Invalid deeplink:', validation.reason);
        return {
          success: false,
          error: validation.reason,
        };
      }

      // Check signature if present
      const signatureStatus = await this.checkSignature(parsed);

      // Determine link type and whether to show modal
      const linkType = this.determineLinkType(parsed, signatureStatus);
      const shouldProceed = await this.checkShouldProceed(
        parsed,
        linkType,
        signatureStatus,
      );

      if (!shouldProceed) {
        DevLogger.log('DeeplinkService: User declined to proceed');
        return {
          success: false,
          shouldProceed: false,
        };
      }

      // Call onHandled callback if provided
      onHandled?.();

      // Create params for action handler
      const actionParams: DeeplinkParams = {
        action: parsed.action,
        path: parsed.path,
        params: parsed.params,
        signature: parsed.signature,
        originalUrl: url,
        scheme: parsed.scheme,
        navigation,
        origin,
      };

      // Special handling for certain actions that need browserCallBack
      if (browserCallBack && parsed.action === ACTIONS.DAPP) {
        actionParams.params.browserCallBack = browserCallBack;
      }

      // Execute the action
      const executed = await this.actionRegistry.execute(
        parsed.action,
        actionParams,
      );

      if (!executed) {
        DevLogger.log(
          'DeeplinkService: No handler found for action:',
          parsed.action,
        );
        return {
          success: false,
          action: parsed.action,
          error: `No handler found for action: ${parsed.action}`,
        };
      }

      return {
        success: true,
        action: parsed.action,
      };
    } catch (error) {
      DevLogger.log('DeeplinkService: Error handling deeplink:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check signature verification for the deeplink
   */
  private async checkSignature(
    parsed: ParsedDeeplink,
  ): Promise<'valid' | 'invalid' | 'missing' | 'not-applicable'> {
    // Only check signatures for supported domains
    if (!parsed.isSupportedDomain && parsed.isUniversalLink) {
      return 'not-applicable';
    }

    // Check if URL has a signature
    if (!parsed.signature) {
      return 'missing';
    }

    try {
      // Create a URL object for signature verification
      const urlObj = new URL(parsed.originalUrl);
      const result = await verifyDeeplinkSignature(urlObj);

      switch (result) {
        case VALID:
          DevLogger.log(
            'DeeplinkService: Verified signature for deeplink',
            parsed.originalUrl,
          );
          return 'valid';
        case INVALID:
        case MISSING:
          DevLogger.log(
            'DeeplinkService: Invalid/Missing signature for deeplink',
            parsed.originalUrl,
          );
          return 'invalid';
        default:
          return 'invalid';
      }
    } catch (error) {
      DevLogger.log('DeeplinkService: Error verifying signature:', error);
      return 'invalid';
    }
  }

  /**
   * Determine the type of link for modal display
   */
  private determineLinkType(
    parsed: ParsedDeeplink,
    signatureStatus: string,
  ): DeepLinkModalLinkType {
    // Invalid domain
    if (parsed.isUniversalLink && !parsed.isSupportedDomain) {
      return DeepLinkModalLinkType.INVALID;
    }

    // Check if action is supported
    const isActionSupported = this.actionRegistry.hasAction(parsed.action);

    // Unsupported action with valid signature
    if (!isActionSupported && signatureStatus === 'valid') {
      return DeepLinkModalLinkType.UNSUPPORTED;
    }

    // Unsupported action without valid signature
    if (!isActionSupported) {
      return DeepLinkModalLinkType.INVALID;
    }

    // Supported action with valid signature
    if (signatureStatus === 'valid') {
      return DeepLinkModalLinkType.PRIVATE;
    }

    // Supported action without signature
    return DeepLinkModalLinkType.PUBLIC;
  }

  /**
   * Check whether to proceed with the deeplink
   */
  private async checkShouldProceed(
    parsed: ParsedDeeplink,
    linkType: DeepLinkModalLinkType,
    signatureStatus: string,
  ): Promise<boolean> {
    // Whitelisted actions don't show modal
    if (this.WHITELISTED_ACTIONS.includes(parsed.action as ACTIONS)) {
      return true;
    }

    // Check interstitial whitelist
    if (
      this.interstitialWhitelist.some((url) =>
        parsed.originalUrl.startsWith(url),
      )
    ) {
      return true;
    }

    // For traditional deeplinks with valid signatures, proceed without modal
    if (!parsed.isUniversalLink && signatureStatus === 'valid') {
      return true;
    }

    // Show modal and wait for user decision
    return new Promise<boolean>((resolve) => {
      const actionName = parsed.action?.replace(/-/g, ' ') || 'action';
      const pageTitle = capitalize(actionName.toLowerCase());

      handleDeepLinkModalDisplay({
        linkType,
        pageTitle,
        onContinue: () => resolve(true),
        onBack: () => resolve(false),
      });
    });
  }

  /**
   * Register all default actions
   * This should be called during app initialization
   */
  registerDefaultActions(): void {
    DevLogger.log('DeeplinkService: Registering default actions');

    // Import and register all actions
    // Using dynamic import to avoid circular dependencies
    import('./actions')
      .then(({ registerAllActions }) => {
        registerAllActions(this.actionRegistry);
      })
      .catch((error) => {
        DevLogger.log('DeeplinkService: Error registering actions:', error);
      });
  }
}

export default DeeplinkService.getInstance();
