import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck, FaChevronDown } from 'react-icons/fa';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options',
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-900 text-left flex items-center justify-between',
          className
        )}
      >
        <span className={selected.length ? 'text-gray-900' : 'text-gray-500'}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <FaChevronDown className={cn('text-gray-500 transition-transform', isOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-full mt-1 bg-white border-2 border-blue-200 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleOption(option)}
                className={cn(
                  'w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-2',
                  selected.includes(option) && 'bg-blue-50'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 border-2 rounded flex items-center justify-center',
                    selected.includes(option)
                      ? 'border-blue-900 bg-blue-900'
                      : 'border-gray-300'
                  )}
                >
                  {selected.includes(option) && <FaCheck className="text-white text-xs" />}
                </div>
                {option}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 