import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  valueClassName?: string;
}

export function Select({ options, value, onChange, placeholder = "Select an option", className, valueClassName }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-lg border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground transition-all duration-300 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
          isOpen && "border-primary ring-1 ring-primary shadow-[0_0_10px_rgba(250,204,21,0.2)]"
        )}
      >
        <span className={cn(selectedOption ? "text-foreground" : "text-muted-foreground", valueClassName)}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border/50 bg-card glass py-1 shadow-xl animate-in fade-in-80 zoom-in-95">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center py-2.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-primary/10 hover:text-primary",
                option.value === value ? "bg-primary/5 text-primary font-medium" : "text-card-foreground"
              )}
            >
              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {option.value === value && <Check className="h-4 w-4" />}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
