import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
  className?: string;
}

export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [currentYear, setCurrentYear] = useState(() => {
    if (value) return parseInt(value.split('-')[0]);
    return new Date().getFullYear();
  });

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMonthSelect = (monthIndex: number) => {
    const formattedMonth = (monthIndex + 1).toString().padStart(2, '0');
    onChange(`${currentYear}-${formattedMonth}`);
    setIsOpen(false);
  };

  const displayValue = value ? (() => {
    const [y, m] = value.split('-');
    const mIdx = parseInt(m) - 1;
    return `${months[mIdx]} ${y}`;
  })() : 'Select Month';

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-11 w-full sm:w-[160px] items-center justify-between rounded-lg border border-border/50 bg-input/50 px-3 py-2 text-sm text-foreground transition-all duration-300 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
          isOpen && "border-primary ring-1 ring-primary shadow-[0_0_10px_rgba(250,204,21,0.2)]"
        )}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {displayValue}
        </span>
        <CalendarIcon className="h-4 w-4 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-[280px] rounded-lg border border-border/50 bg-card glass p-3 shadow-xl animate-in fade-in-80 zoom-in-95">
          <div className="flex items-center justify-between mb-4">
            <button 
              type="button"
              onClick={() => setCurrentYear(prev => prev - 1)}
              className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="font-semibold text-foreground">{currentYear}</div>
            <button 
              type="button"
              onClick={() => setCurrentYear(prev => prev + 1)}
              className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => {
              const isSelected = value === `${currentYear}-${(index + 1).toString().padStart(2, '0')}`;
              
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleMonthSelect(index)}
                  className={cn(
                    "py-2 px-1 text-sm rounded-md transition-colors",
                    isSelected 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
