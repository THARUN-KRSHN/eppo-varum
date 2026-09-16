import './globals.css';
import Nav from '../components/Nav';
import { LanguageProvider } from '../components/LanguageProvider';
import { AuthProvider } from '../components/AuthProvider';

export default function Layout({ children }: { children: React.ReactNode }) {
	return <html lang="en"><body><LanguageProvider><AuthProvider><Nav />{children}</AuthProvider></LanguageProvider></body></html>;
}
