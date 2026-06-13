export interface RNComponentInfo {
  componentName: string;
  /** Parent user component (e.g. "Card" when tapping a Text inside Card) */
  parentComponent: string | null;
  /** Text content of the tapped element (e.g. "Heading 2") */
  textContent: string | null;
  filePath: string | null;
  lineNumber: number | null;
  /** Props of the direct (tapped) native fiber */
  props: Record<string, unknown> | null;
  /** Props of the parent user component (e.g. ColorSwatch's color, label) */
  parentProps: Record<string, unknown> | null;
  testID: string | null;
  /** Ancestor chain from direct component up (e.g. ["View", "ColorSwatch", "Card", "App"]) */
  ancestorChain: string[];
  // Layout as measured by UIManager
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageX: number;
    pageY: number;
  } | null;
  // Resolved styles from StyleSheet
  style: Record<string, unknown> | null;
  /** Names of styles currently applied via style={[styles.foo, styles.bar]} */
  styleNames: string[];
}

export interface DesignerModeRNOptions {
  /** URL of the relay server, e.g. http://192.168.1.100:3334 */
  relayUrl: string;
  /** How often to poll for agent response, ms. Default: 2000 */
  pollInterval?: number;
}

export interface ChangesetEntry {
  property: string;
  original: string;
  current: string;
}
