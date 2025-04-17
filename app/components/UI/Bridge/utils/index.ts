export const isBridgeUiEnabled = () => {
  const enabled = process.env.MM_BRIDGE_UI_ENABLED === 'true';
  return enabled;
};
