import { ChartButton } from './ChartTimespanButtonGroup/ChartTimespanButtonGroup.types';

export type DataPoint = Record<string, unknown> | number;

export type Accessor<T, R> = (point: T) => R;

export interface GraphOptions {
  insetTop: number;
  insetBottom: number;
  insetLeft: number;
  insetRight: number;
  timespanButtons: ChartButton[];
  color: string;
}
