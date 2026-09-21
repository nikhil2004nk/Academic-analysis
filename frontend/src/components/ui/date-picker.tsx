import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

export function DatePicker({ value, onChange, className, required }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const [currentMonth, setCurrentMonth] = useState(() => {
    return value ? new Date(value) : new Date();
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      // Ensure the popup doesn't go off the bottom of the screen
      const spaceBelow = window.innerHeight - rect.bottom;
      const popupHeight = 350; // Approx height
      
      let top = rect.bottom + window.scrollY;
      if (spaceBelow < popupHeight && rect.top > popupHeight) {
        top = rect.top + window.scrollY - popupHeight;
      }
      
      setCoords({
        top,
        left: rect.left + window.scrollX
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        popupRef.current && !popupRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateSelect = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = 'd';
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-left transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">
          {value ? format(new Date(value), 'PPP') : 'Select a date...'}
        </span>
        <CalendarIcon className="h-4 w-4 opacity-50" />
      </button>

      {/* Hidden input for HTML form validation */}
      {required && (
        <input 
          type="text" 
          required={required}
          value={value}
          onChange={() => {}}
          className="absolute opacity-0 w-0 h-0 pointer-events-none" 
          tabIndex={-1}
        />
      )}

      {isOpen && mounted && createPortal(
        <div 
          ref={popupRef}
          className="absolute z-[9999] mt-1 w-[280px] p-3 rounded-md border border-white/10 bg-zinc-950/95 backdrop-blur-md shadow-xl"
          style={{ top: coords.top, left: coords.left }}
        >
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handlePrevMonth}
              type="button"
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="font-semibold text-sm">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <button
              onClick={handleNextMonth}
              type="button"
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
            {weekDays.map(day => (
              <div key={day} className="w-8 h-8 flex items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isSelected = value && isSameDay(day, new Date(value));
              const isCurrentMonth = isSameMonth(day, monthStart);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDateSelect(day);
                  }}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors",
                    !isCurrentMonth ? "text-muted-foreground/30 hover:text-muted-foreground/50" : "text-white hover:bg-white/10",
                    isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90 font-bold" : ""
                  )}
                >
                  {format(day, dateFormat)}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
