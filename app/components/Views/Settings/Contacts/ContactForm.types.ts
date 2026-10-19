/**
 * Contact form navigation parameters
 */
export interface ContactFormParams {
  mode?: 'add' | 'edit';
  address?: string;
  onDelete?: () => void;
}
