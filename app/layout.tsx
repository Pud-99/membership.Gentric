import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gentric Club · Chơi hết mình, nhận đặc quyền",
  description: "Không gian thành viên Gentric Station. Tích điểm, thăng hạng và đổi những trải nghiệm gaming dành riêng cho bạn.",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
  icons: {
    icon: "/gentric-logo.png",
    shortcut: "/gentric-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
