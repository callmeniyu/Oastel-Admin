/**
 * Test file to verify HTML validation functions work correctly
 * This can be run in a test environment to ensure the validation works as expected
 */

import { stripHtmlTags, getPlainTextLength } from './htmlValidation';

// Test cases for HTML stripping
const testCases = [
  // Basic HTML content
  {
    input: '<p>This is a test</p>',
    expected: 'This is a test',
    description: 'Basic paragraph tag'
  },
  // HTML with formatting
  {
    input: '<p><strong>Bold text</strong> and <em>italic text</em></p>',
    expected: 'Bold text and italic text',
    description: 'Mixed formatting tags'
  },
  // List content from RichTextEditor
  {
    input: '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>',
    expected: 'Item 1 Item 2 Item 3',
    description: 'Unordered list'
  },
  // Complex nested HTML
  {
    input: '<div><h2>Heading</h2><p>Some <strong>important</strong> content with <a href="#">links</a>.</p></div>',
    expected: 'Heading Some important content with links.',
    description: 'Complex nested structure'
  },
  // HTML entities
  {
    input: '<p>Test &amp; validation &lt;script&gt; with &nbsp; spaces</p>',
    expected: 'Test & validation <script> with   spaces',
    description: 'HTML entities'
  },
  // Empty content
  {
    input: '<p></p>',
    expected: '',
    description: 'Empty paragraph'
  },
  // Multiple line breaks and whitespace
  {
    input: '<p>Line 1</p>\n<p>Line 2</p>\n<br><p>Line 3</p>',
    expected: 'Line 1 Line 2 Line 3',
    description: 'Multiple paragraphs with whitespace'
  }
];

// Run tests (this would be part of a test suite)
console.log('HTML Validation Tests:');
testCases.forEach((test, index) => {
  const result = stripHtmlTags(test.input);
  const passed = result === test.expected;
  
  console.log(`Test ${index + 1}: ${test.description}`);
  console.log(`  Input: ${test.input}`);
  console.log(`  Expected: "${test.expected}"`);
  console.log(`  Got: "${result}"`);
  console.log(`  Status: ${passed ? 'PASS' : 'FAIL'}`);
  console.log('');
});

// Test minimum length validation
console.log('Length Validation Tests:');
const lengthTests = [
  {
    input: '<p>Short</p>', // 5 characters
    minLength: 10,
    shouldPass: false,
    description: 'Short content should fail'
  },
  {
    input: '<p>This is a longer text that should pass validation</p>', // 49 characters
    minLength: 10,
    shouldPass: true,
    description: 'Long content should pass'
  },
  {
    input: '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>', // 18 characters
    minLength: 15,
    shouldPass: true,
    description: 'List content should pass when long enough'
  }
];

lengthTests.forEach((test, index) => {
  const length = getPlainTextLength(test.input);
  const passed = (length >= test.minLength) === test.shouldPass;
  
  console.log(`Length Test ${index + 1}: ${test.description}`);
  console.log(`  Input: ${test.input}`);
  console.log(`  Plain text length: ${length}`);
  console.log(`  Min required: ${test.minLength}`);
  console.log(`  Should pass: ${test.shouldPass}`);
  console.log(`  Status: ${passed ? 'PASS' : 'FAIL'}`);
  console.log('');
});

export {}; // Make this a module