import dateFormat from './dateFormat';

export const formatDate = (
  date: Date | string,
  pattern: string = "dd MMM, yyyy"
): string => {
  return dateFormat(date, pattern);
}; 