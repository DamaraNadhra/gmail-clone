import React, { useState, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";


interface EmailInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function EmailInput({
  value = [],
  onChange,
  placeholder = "Enter email address",
  className = "",
}: EmailInputProps) {
  const [input, setInput] = useState("");
  const [validationError, setValidationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setValidationError("");
  };

  const addEmail = () => {
    if (!input.trim()) return;

    // Validate the email format
    if (!validateEmail(input)) {
      setValidationError("Please enter a valid email address");
      return;
    }

    // Check for duplicates
    if (value.some((item) => item === input.trim())) {
      setValidationError("This email is already added");
      return;
    }

    // Add the new email
    const newEmail = input.trim();

    onChange([...value, newEmail]);
    setInput("");
    setValidationError("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
      e.preventDefault();
      addEmail();
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      // Remove the last email when backspace is pressed and input is empty
      onChange(value.slice(0, -1));
    }
  };

  const removeEmail = (index: number) => {
    const newEmails = [...value];
    newEmails.splice(index, 1);
    onChange(newEmails);
  };

  return (
    <div className="relative">
      <div
        className={`flex flex-wrap items-center gap-1 rounded-md ${className}`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((item, index) => (
          <div
            key={item || index}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-sm "
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(index);
              }}
              className="ml-1 rounded-full hover:bg-blue-200"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={addEmail}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 border-none text-sm bg-transparent outline-none focus:outline-none focus:ring-0"
        />
      </div>
      {validationError && (
        <div className="mt-1 text-xs text-red-500">{validationError}</div>
      )}
    </div>
  );
}
