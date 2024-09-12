import { strings } from '../../../locales/i18n';

export function toLocaleDateTime(timestamp) {
  const dateObj = new Date(timestamp);
  const date = dateObj.toLocaleDateString();
  const time = dateObj.toLocaleTimeString();
  return `${date} ${time}`;
}

export function toDateFormat(timestamp) {
  const date = new Date(timestamp);
  const month = strings(`date.months.${date.getMonth()}`);
  const day = date.getDate();
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours %= 12;
  hours = hours || 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${month} ${day} ${strings(
    'date.connector',
  )} ${hours}:${minutes} ${ampm}`;
}

export function toLocaleDate(timestamp) {
  return new Date(timestamp).toLocaleDateString();
}

export function toLocaleTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * This function will return the difference between today and a provided date in milliseconds
 * @param {Date} sessionTime - Date object
 * @returns the difference between two dates in milliseconds
 */
export function msBetweenDates(date) {
  const today = new Date();
  return Math.abs(date.getTime() - today.getTime());
}

/**
 * This function will return how many hours in on a determinated amount of milliseconds
 * @param {number} milliseconds - Milliseconds number
 * @returns how many hours in on a determinated amount of milliseconds
 */
export function msToHours(milliseconds) {
  return milliseconds / (60 * 60 * 1000);
}

/**
 * this function will convert a timestamp to the 'yyyy-MM-dd' format
 * @param {*} timestamp timestamp you wish to convert in milliseconds
 * @returns formatted date yyyy-MM-dd
 */
export const formatTimestampToYYYYMMDD = (timestamp) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
