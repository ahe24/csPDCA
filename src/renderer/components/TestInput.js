// Test component for input handling
import React, { useState } from 'react';
import Input from './Input';

const TestInput = () => {
  const [value, setValue] = useState('');
  
  const handleChange = (e) => {
    console.log('Input value changed:', e.target.value);
    setValue(e.target.value);
  };
  
  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>테스트 입력 필드</h3>
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="여기에 입력하세요"
        style={{ padding: '8px', width: '100%', marginBottom: '10px' }}
      />
      <p>입력된 값: {value}</p>
    </div>
  );
};

export default TestInput;
