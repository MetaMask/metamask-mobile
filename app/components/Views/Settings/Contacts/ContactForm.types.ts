/**
 * Contact form navigation parameters
 */
export interface ContactFormParams {
  mode?: 'add' | 'edit';
  editMode?: 'add' | 'edit';
  address?: string;
  name?: string;
  onDelete?: () => void;
  dispatch?: () => void;
}
