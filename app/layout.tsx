import type {Metadata} from "next";
import "./globals.css";
import "./modules.css";
import "./finishing.css";
import "./live.css";
import "./emblem.css";
import "./register.css";
import "./verification.css";
import "./social.css";
import "./design-system.css";
import RegisterServiceWorker from "./register-service-worker";

export const metadata:Metadata={
  title:"MatIQ Jiu-Jitsu Intelligence",
  description:"An all-athlete performance system for competition video evaluation, training, skill development, and promotion readiness.",
  manifest:"/manifest.webmanifest",
  applicationName:"matIQ",
  appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"matIQ"},
  formatDetection:{telephone:false},
  icons:{icon:"/matiq-emblem.png",shortcut:"/matiq-emblem.png",apple:"/apple-touch-icon.png"},
  openGraph:{title:"MatIQ Jiu-Jitsu Intelligence",description:"Train with evidence. Compete with intelligence. Develop for the long term.",type:"website"},
  twitter:{card:"summary",title:"MatIQ Jiu-Jitsu Intelligence",description:"The all-athlete BJJ performance operating system."}
};
export const viewport={themeColor:"#7a1026",width:"device-width",initialScale:1,viewportFit:"cover"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><RegisterServiceWorker/><a className="skip-link" href="#main-workspace">Skip to main workspace</a><nav className="product-launchers" aria-label="MatIQ platform"><span>MATIQ PLATFORM</span><a href="/register">Register Individual</a><a href="/portfolio">Portfolio</a><a href="/network">Network</a><a href="/academy">Academy</a><a href="/academy/profile">Profile</a><a href="/archive">Local Archive</a><a href="/install">Install</a><a href="/settings">Settings</a></nav><div id="main-workspace" tabIndex={-1}>{children}</div><footer className="governance-footer"><span>© 2026 Apex Governance Group</span><nav aria-label="Governance"><a href="/privacy">Privacy</a><a href="/legal">Terms</a><a href="/community-standards">Community Standards</a><a href="/revenue-sharing">Revenue Sharing</a></nav></footer></body></html>}
