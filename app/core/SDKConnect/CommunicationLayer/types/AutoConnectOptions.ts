export interface AutoConnectOptions {
  enable?: boolean;
  timeout?: number; // number is ms, how long to wait for mm mobile
  // type: behavior once timeout is reached
  // RENEW -> generate new channel id
  // LINK -> call deeplink
  // type: AutoConnectType;
}
