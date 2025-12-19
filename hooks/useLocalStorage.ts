
import { useState, useEffect, useRef } from 'react';

const replacer = (_key: string, value: any) => {
  if (value instanceof Set) {
    return {
      dataType: 'Set',
      value: Array.from(value),
    };
  }
  return value;
};

const reviver = (_key: string, value: any) => {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Set') {
      return new Set(value.value);
    }
  }
  return value;
};

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item, reviver) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const valueRef = useRef(storedValue);
  
  // Update ref immediately when state changes
  useEffect(() => {
    valueRef.current = storedValue;
  }, [storedValue]);

  // Debounced save to localStorage
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueRef.current, replacer));
        }
      } catch (error) {
        console.error("Error writing to localStorage", error);
      }
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [storedValue, key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
    } catch (error) {
      console.error(error);
    }
  };
  
  return [storedValue, setValue];
}

export default useLocalStorage;
