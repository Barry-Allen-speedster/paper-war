import { GameLobby } from "@components/lobby/GameLobby";
import { ErrorBoundary } from "@components/ui/ErrorBoundary";
import { ToastProvider } from "@components/ui/Toast";

interface Props {
  params: { code: string };
}

export default function JoinPage({ params }: Props) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <GameLobby initialCode={params.code} />
      </ToastProvider>
    </ErrorBoundary>
  );
}
