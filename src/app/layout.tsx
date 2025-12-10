import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AccountRecoveryModal from "@/components/account-recovery-modal";
import "@/lib/client-security";
import { createClient } from "@/utils/supabase/server";
import { Database } from "@/types/supabase";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "Vision Inc. Marketing",
  description: "Marketing Application for Vision Inc.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Database['public']['Tables']['profiles']['Row'] | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data as Database['public']['Tables']['profiles']['Row'] | null;
  }

  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSansKr.variable} antialiased font-sans min-h-screen flex flex-col bg-white`}
      >
        <AuthProvider initialUser={user} initialProfile={profile}>
          <AccountRecoveryModal />
          <Header />
          {/* 
            Standardized Container:
            - max-w-7xl: Matches Header
            - mx-auto: Centers the container
            - px-4 sm:px-6 lg:px-8: Standard responsive padding
            - w-full: Ensures full width up to max-w
          */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
