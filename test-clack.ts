import { select, password } from '@clack/prompts';

// Test the API format
const test = async () => {
  const choice = await select({
    message: 'Test select',
    options: [
      { label: 'Option 1', value: 'option1' },
      { label: 'Option 2', value: 'option2' },
    ],
  });

  const pwd = await password({
    message: 'Test password',
  });
};
