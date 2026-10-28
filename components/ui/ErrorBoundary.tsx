"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-[var(--pw-bg)]">
          <h1 className="text-2xl font-bold mb-4 text-[var(--pw-text)]">
            Something went wrong
          </h1>
          <p className="text-[var(--pw-text-muted)] mb-6 max-w-md">
            An unexpected error occurred. Please refresh the page to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-lg bg-[var(--pw-accent)] text-white font-medium"
          >
            Refresh
          </button>
          {process.env["NODE_ENV"] === "development" && this.state.error && (
            <pre className="mt-6 text-left text-xs bg-red-950 text-red-300 p-4 rounded max-w-full overflow-auto">
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
