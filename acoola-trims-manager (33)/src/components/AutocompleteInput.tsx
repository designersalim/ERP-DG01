/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';

interface AutocompleteInputProps {
  id: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}

export default function AutocompleteInput({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = '',
  required = false
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Unique list of options, filtered by what's typed
    const uniqueOptions = Array.from(new Set(options.map(o => o.trim()))).filter(Boolean);
    if (!value) {
      setFiltered(uniqueOptions);
    } else {
      setFiltered(
        uniqueOptions.filter(o =>
          o.toLowerCase().includes(value.toLowerCase())
        )
      );
    }
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef} id={`container-${id}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(true);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-sans text-xs"
            title="Clear"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl divide-y divide-gray-50 focus:outline-hidden text-sm">
          {filtered.map((option, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => handleSelect(option)}
                className="w-full text-left px-4 py-2 hover:bg-emerald-50 active:bg-emerald-100 text-gray-700 transition-colors cursor-pointer"
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
