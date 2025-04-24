import { getAuthTokens } from '.';
import { AuthConnection, HandleFlowParams, LoginHandlerResult } from '../Oauth2loginInterface';

export abstract class BaseLoginHandler {
    abstract get authConnection(): AuthConnection;
    abstract get scope(): string[];
    abstract get authServerPath(): string;
    abstract login(): Promise<LoginHandlerResult | undefined>

    getAuthTokens(params: HandleFlowParams, authServerUrl: string) {
        return getAuthTokens(params, this.authServerPath, authServerUrl);
    }
}
