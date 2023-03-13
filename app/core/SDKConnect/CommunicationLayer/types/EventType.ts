export enum EventType {
  // emitted everytime the current step is updated
  KEY_INFO = 'key_info',
  SERVICE_STATUS = 'service_status',
  KEYS_EXCHANGED = 'keys_exchanged',
  JOIN_CHANNEL = 'join_channel',
  CHANNEL_CREATED = 'channel_created',
  CLIENTS_CONNECTED = 'clients_connected',
  CLIENTS_DISCONNECTED = 'clients_disconnected',
  CLIENTS_WAITING = 'clients_waiting',
  CLIENTS_READY = 'clients_ready',
  SOCKET_DISCONNECTED = 'socket_disconnected',
  OTP = 'otp',
  CONNECTION_STATUS = 'connection_status',
  MESSAGE = 'message',
  TERMINATE = 'terminate',
}
