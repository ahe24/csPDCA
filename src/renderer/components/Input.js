// Custom Input component that works reliably in Electron
import React, { useState, useEffect, useRef } from 'react';

const Input = ({ 
  type = 'text', 
  value = '', 
  onChange, 
  placeholder = '', 
  className = '', 
  id = '',
  name = '',
  disabled = false,
  ...props 
}) => {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef(null);
  
  // Update internal state when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  // Handle input change
  const handleChange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Call external onChange handler if provided
    if (onChange) {
      // Create a synthetic event that mimics the native event
      const syntheticEvent = {
        target: {
          name: name || id,
          value: newValue,
          type: type
        },
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      
      console.log(`Input changed: ${name || id} = ${newValue}`);
      onChange(syntheticEvent);
    }
  };
  
  // Handle focus events to ensure proper input behavior
  const handleFocus = (e) => {
    if (props.onFocus) {
      props.onFocus(e);
    }
  };
  
  const handleBlur = (e) => {
    if (props.onBlur) {
      props.onBlur(e);
    }
  };
  
  return (
    <input
      ref={inputRef}
      type={type}
      value={inputValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`form-control ${className}`}
      id={id}
      name={name || id}
      disabled={disabled}
      {...props}
    />
  );
};

export default Input;
