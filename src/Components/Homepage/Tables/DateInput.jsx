import React, { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { DISPLAY_DATE_FORMAT, formatDateForDisplay, toIsoDate } from "./dateUtils";

const DateInput = ({
  value,
  onChange,
  onValueChange,
  name,
  className = "",
  placeholder = DISPLAY_DATE_FORMAT,
  type: _type,
  min,
  max,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState(formatDateForDisplay(value));
  const pickerRef = useRef(null);

  useEffect(() => {
    setDisplayValue(formatDateForDisplay(value));
  }, [value]);

  const emitChange = (nextValue) => {
    onValueChange?.(nextValue);
    onChange?.({ target: { name, value: nextValue } });
  };

  const isWithinBounds = (isoDate) => {
    const minDate = toIsoDate(min);
    const maxDate = toIsoDate(max);

    if (minDate && isoDate < minDate) return false;
    if (maxDate && isoDate > maxDate) return false;
    return true;
  };

  const openPicker = () => {
    if (props.disabled || props.readOnly) return;

    const picker = pickerRef.current;
    if (picker?.showPicker) {
      try {
        picker.showPicker();
      } catch {
        picker.focus();
      }
    } else {
      picker?.focus();
      picker?.click();
    }
  };

  const handleChange = (event) => {
    const nextDisplayValue = event.target.value;
    setDisplayValue(nextDisplayValue);

    if (!nextDisplayValue.trim()) {
      emitChange("");
      return;
    }

    const isoDate = toIsoDate(nextDisplayValue);
    if (isoDate && isWithinBounds(isoDate)) {
      emitChange(isoDate);
    }
  };

  const handleBlur = () => {
    if (!displayValue.trim()) {
      setDisplayValue("");
      emitChange("");
      return;
    }

    const isoDate = toIsoDate(displayValue);
    if (isoDate && isWithinBounds(isoDate)) {
      setDisplayValue(formatDateForDisplay(isoDate));
    } else {
      setDisplayValue(formatDateForDisplay(value));
    }
  };

  return (
    <span className="relative inline-block w-full">
      <input
        type="text"
        name={name}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onClick={openPicker}
        placeholder={placeholder}
        className={`${className} pr-8`}
        {...props}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={props.disabled || props.readOnly}
        tabIndex={-1}
        aria-label="Select date"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 disabled:pointer-events-none disabled:opacity-40"
      >
        <Calendar size={14} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={toIsoDate(value)}
        min={toIsoDate(min)}
        max={toIsoDate(max)}
        disabled={props.disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const nextValue = event.target.value;
          emitChange(nextValue);
          setDisplayValue(formatDateForDisplay(nextValue));
        }}
        className="absolute h-px w-px opacity-0 pointer-events-none"
      />
    </span>
  );
};

export default DateInput;
