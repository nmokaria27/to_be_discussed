import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The AI Beta-Tester Swarm',
  description: 'Persona-diverse AI agents beta-test your mobile app on parallel real simulators.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
