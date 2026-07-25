"use client";

import { useCallback, useState } from "react";

export function useCharacterLimit({ maxLength, initialValue = "" }) {
  const [value, setValue] = useState(initialValue);
  const [characterCount, setCharacterCount] = useState(initialValue.length);

  const handleChange = (event) => {
    const newValue = event.target.value;
    if (newValue.length <= maxLength) {
      setValue(newValue);
      setCharacterCount(newValue.length);
    }
  };

  const reset = useCallback((nextValue = "") => {
    setValue(nextValue);
    setCharacterCount(nextValue.length);
  }, []);

  return {
    value,
    characterCount,
    handleChange,
    maxLength,
    reset,
    setValue: reset,
  };
}
