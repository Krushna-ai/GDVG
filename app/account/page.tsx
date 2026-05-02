import type { Metadata } from 'next';
import AccountClient from './AccountClient';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Manage your GDVG account settings',
};

export default function AccountPage() {
  return <AccountClient />;
}
