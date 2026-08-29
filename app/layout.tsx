import type { Metadata } from "next";
import "./globals.css";
import "./modules.css";
import "./finishing.css";
export const metadata: Metadata = { title: "MatIQ Youth Jiu-Jitsu Intelligence", description: "A privacy-first operating system for youth athlete development, competition preparation, coaching intelligence, and institutional learning.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" }, openGraph: { title: "MatIQ Youth Jiu-Jitsu Intelligence", description: "Train with evidence. Coach with clarity. Develop athletes for the long term.", type: "website" }, twitter: { card: "summary", title: "MatIQ Youth Jiu-Jitsu Intelligence", description: "The youth BJJ development operating system." } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
