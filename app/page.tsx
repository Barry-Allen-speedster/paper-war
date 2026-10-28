import { MainMenu } from "@components/menu/MainMenu";
import { ErrorBoundary } from "@components/ui/ErrorBoundary";
import { ToastProvider } from "@components/ui/Toast";

export default function HomePage() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <MainMenu />
      </ToastProvider>
    </ErrorBoundary>
  );
}
