// Utility functions and helpers

export const formatDate = (date: Date): string => {
  // TODO: Implement date formatting
  return date.toISOString();
};

export const debounce = (func: Function, delay: number) => {
  // TODO: Implement debounce utility
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

export const classNames = (...classes: string[]) => {
  return classes.filter(Boolean).join(' ');
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};