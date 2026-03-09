import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
    const response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Not logged in — redirect to login
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check admin_role on the profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('admin_role')
        .eq('id', user.id)
        .single();

    if (!profile?.admin_role) {
        // Logged in but not an admin
        return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }

    // Pass the role via header so server components can read it without another DB call
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-admin-role', profile.admin_role);

    return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
    matcher: ['/dashboard/:path*'],
};
