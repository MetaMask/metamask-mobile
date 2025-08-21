import { test, expect } from 'appwright';

test('User can login', async ({ device }) => {
  await device.getByText('Username').fill('admin');
  await device.getByText('Password').fill('password');
  await device.getByText('Login').tap();
});
