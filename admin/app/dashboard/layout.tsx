import { headers } from 'next/headers';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

const navItems = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/users', label: 'Users', icon: '👥' },
    { href: '/dashboard/news', label: 'News', icon: '📰' },
    { href: '/dashboard/feedback', label: 'Feedback', icon: '💬' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const headersList = await headers();
    const adminRole = headersList.get('x-admin-role') ?? '';

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-60 bg-gray-900 flex flex-col">
                {/* Logo */}
                <div className="px-6 py-5 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">C</div>
                        <span className="text-white font-semibold text-sm">CurioConnect</span>
                    </div>
                    <div className="mt-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${adminRole === 'full_admin' ? 'bg-primary/20 text-primary' : 'bg-gray-700 text-gray-400'}`}>
                            {adminRole === 'full_admin' ? 'Full Admin' : 'Read Only'}
                        </span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium"
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Footer */}
                <div className="px-3 py-4 border-t border-gray-800 space-y-3">
                    <LogoutButton />
                    <p className="text-center text-xs text-gray-600">v0.1.0</p>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
