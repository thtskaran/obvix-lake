// Utility functions and helpers

export const formatDate = (date: Date): string => {
  // TODO: Implement date formatting
  return date.toISOString();
};

export const debounce = <T extends (...args: unknown[]) => void>(func: T, delay: number) => {
  // TODO: Implement debounce utility
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

export const classNames = (...classes: Array<string | false | null | undefined>) => {
  return classes.filter(Boolean).join(' ');
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};