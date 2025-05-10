// Custom Textarea component that works reliably in Electron
import React, { useState, useEffect, useRef } from 'react';

const Textarea = ({ 
  value = '', 
  onChange, 
  placeholder = '', 
  className = '', 
  id = '',
  name = '',
  disabled = false,
  ...props 
}) => {
  const [textValue, setTextValue] = useState(value);
  const textareaRef = useRef(null);
  
  // Update internal state when external value changes
  useEffect(() => {
    setTextValue(value);
  }, [value]);
  
  // Handle textarea change
  const handleChange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newValue = e.target.value;
    setTextValue(newValue);
    
    // Call external onChange handler if provided
    if (onChange) {
      // Create a synthetic event that mimics the native event
      const syntheticEvent = {
        target: {
          name: name || id,
          value: newValue,
          type: 'textarea'
        },
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      
      console.log(`Textarea changed: ${name || id} = ${newValue.substring(0, 20)}${newValue.length > 20 ? '...' : ''}`);
      onChange(syntheticEvent);
    }
  };
  
  // Handle focus events to ensure proper textarea behavior
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
    <textarea
      ref={textareaRef}
      value={textValue}
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

export default Textarea;
