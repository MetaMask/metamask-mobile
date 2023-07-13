export interface MessageInfo {
  origin: string;
  type: string;
}

export interface PageMeta {
  analytics?: {
    request_platform: string;
    request_source: string;
  };
  icon?: string;
  title: string;
  url: string;
}

export interface MessageParams {
  data: string;
  from: string;
  metamaskId: string;
  meta?: PageMeta;
  origin: string;
}
