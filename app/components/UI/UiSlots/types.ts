// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type AlertBannerWidget = {
  type: 'alert-banner';
  schemaVersion: 1;
  props: {
    tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
    title: string;
    description: string;
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DismissUiSlotAction = {
  actionId: 'dismiss';
  trigger: 'close';
  params: {
    scope: 'content';
  };
  required?: boolean;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type NavigateDeeplinkUiSlotAction = {
  actionId: 'navigate-deeplink';
  trigger: 'press';
  params: {
    deeplink: string;
  };
  required?: boolean;
};

declare module '../../../core/Engine/controllers/ui-slots-controller/types' {
  interface UiSlotWidgetMap {
    'alert-banner': AlertBannerWidget;
  }

  interface UiSlotActionMap {
    dismiss: DismissUiSlotAction;
    'navigate-deeplink': NavigateDeeplinkUiSlotAction;
  }
}
