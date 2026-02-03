/**
 * Contact form navigation parameters
 */
export interface ContactFormParams {
  mode?: 'add' | 'edit';
  address?: string;
  name?: string;
  onUpdate?: () => void;
}
