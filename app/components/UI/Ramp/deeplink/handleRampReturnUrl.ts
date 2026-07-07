import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import Logger from '../../../../util/Logger';

interface HandleRampReturnUrlParams {
  rampReturnPath: string;
}

export default function handleRampReturnUrl({
  rampReturnPath,
}: HandleRampReturnUrlParams) {
  try {
    const parsed = new URL(rampReturnPath, 'https://placeholder.local');
    const orderId = parsed.searchParams.get('orderId') ?? undefined;

    NavigationService.navigation.navigate(Routes.RAMP.RAMPS_ORDER_DETAILS, {
      orderId,
      showCloseButton: true,
    });
  } catch (error) {
    Logger.error(error as Error, {
      message: 'Error in handleRampReturnUrl',
      rampReturnPath,
    });
  }
}
