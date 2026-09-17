import './globals.css';
import Nav from '../components/Nav';
import { LanguageProvider } from '../components/LanguageProvider';
import { AuthProvider } from '../components/AuthProvider';
import Footer from '../components/Footer';

export const metadata = {
	title: 'eppo varum | എപ്പോ വരും',
	description: 'Verified local bus timetables and community transit routes.',
	icons: { icon: '/logo.png', shortcut: '/logo.png', apple: '/logo.png' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
	return <html lang="en"><body><LanguageProvider><AuthProvider><Nav />{children}<Footer /></AuthProvider></LanguageProvider></body></html>;
}
