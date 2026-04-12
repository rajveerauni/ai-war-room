import './globals.css';
import Sidebar from './components/Sidebar';
import OnboardingOverlay from './components/OnboardingOverlay';
import SettingsDrawer from './components/SettingsDrawer';
import PageTransition from './components/PageTransition';

export const metadata = {
  title: 'AI War Room | Tactical Intelligence',
};

export default function RootLayout({ children }) {
  return (
    <html className="dark" lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <script id="tailwind-config" dangerouslySetInnerHTML={{ __html: `
          tailwind.config = {
            darkMode: "class",
            theme: { extend: { colors: {
              "on-tertiary-container": "#000000",
              "surface": "#131313",
              "background": "#131313",
              "on-background": "#e5e2e1",
              "on-tertiary-fixed": "#ffffff",
              "on-surface-variant": "#c6c6c6",
              "primary-container": "#d4d4d4",
              "tertiary-fixed-dim": "#930013",
              "secondary-fixed-dim": "#21c45d",
              "outline": "#919191",
              "on-error": "#690005",
              "surface-variant": "#353534",
              "on-primary-container": "#000000",
              "tertiary-container": "#ff5451",
              "surface-container": "#201f1f",
              "surface-container-highest": "#353534",
              "surface-container-high": "#2a2a2a",
              "on-secondary-fixed": "#002109",
              "surface-dim": "#131313",
              "secondary": "#4ae176",
              "secondary-container": "#005321",
              "primary-fixed-dim": "#454747",
              "tertiary": "#ffdad7",
              "on-error-container": "#ffdad6",
              "on-surface": "#e5e2e1",
              "on-tertiary": "#410004",
              "inverse-primary": "#5d5f5f",
              "surface-bright": "#3a3939",
              "on-primary-fixed": "#ffffff",
              "on-primary-fixed-variant": "#e2e2e2",
              "primary-fixed": "#5d5f5f",
              "on-secondary-fixed-variant": "#00461b",
              "secondary-fixed": "#4ae176",
              "surface-container-low": "#1c1b1b",
              "on-primary": "#1a1c1c",
              "primary": "#ffffff",
              "surface-container-lowest": "#0e0e0e",
              "outline-variant": "#474747",
              "surface-tint": "#c6c6c7",
              "on-tertiary-fixed-variant": "#ffdad7",
              "on-secondary-container": "#6bff8f",
              "inverse-surface": "#e5e2e1",
              "error": "#ffb4ab",
              "error-container": "#93000a",
              "tertiary-fixed": "#b91a24",
              "on-secondary": "#002109",
              "inverse-on-surface": "#313030"
            }, borderRadius: { DEFAULT: "0.125rem", lg: "0.25rem", xl: "0.5rem", full: "0.75rem" }, fontFamily: { headline: ["Inter"], body: ["Inter"], label: ["Inter"] } } },
          };
        `}} />
        <style dangerouslySetInnerHTML={{ __html: `
          body { font-family: 'Inter', sans-serif; background-color: #131313; color: #e5e2e1; }
          .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
          .tonal-shift { background: linear-gradient(180deg, #1c1b1b 0%, #131313 100%); }
          .ghost-border { outline: 1px solid rgba(71, 71, 71, 0.15); }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: #131313; }
          ::-webkit-scrollbar-thumb { background: #353534; }
        `}} />
      </head>
      <body className="antialiased m-0">
        <OnboardingOverlay />
        <SettingsDrawer />
        <Sidebar />
        <div className="ml-[220px] pt-24 px-8 pb-12 min-h-screen">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
