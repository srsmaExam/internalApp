import { AppShell, type NavItem } from '@/components/AppShell';
import type { Session } from '@/lib/session';

export async function StudentChrome({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  const nav: NavItem[] = [
    { href: '/student', label: 'My tests', exact: true },
    { href: '/student/about', label: 'About SRSMA' },
  ];

  return (
    <AppShell session={session} nav={nav}>
      {children}
    </AppShell>
  );
}
