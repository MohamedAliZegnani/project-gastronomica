import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-full place-items-center px-4">
          <div className="max-w-md text-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl">Something spilled</h1>
            <p className="mt-2 text-sm text-[color:var(--color-muted)]">
              {this.state.error.message || "An unexpected error occurred."}
            </p>
            <Button className="mt-6" onClick={() => window.location.assign("/")}>
              Back to kitchen
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
