import { Component } from "react";
import { AlertTriangle } from "lucide-react";

// Root cause of the "URL changes but the page goes blank" bug: this app has
// no error boundary anywhere. If a page throws during render (e.g. reading
// a field off data that's still settling right after a client-side route
// change), React unmounts the ENTIRE tree with nothing left to show —
// a permanently blank page — while a hard refresh "fixes" it only because
// it starts every slice of state fresh, sidestepping whatever transient
// condition caused the crash.
//
// This boundary catches that render error and shows a recoverable fallback
// with a "Try again" button that simply clears the error and re-renders the
// same children (no window.location.reload(), no full-page refresh). App.jsx
// also keys this boundary by the current pathname, so navigating to a
// different route automatically clears a stuck error state too.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep this as a real console.error (not swallowed) so the underlying
    // bug is still visible/debuggable instead of just silently recovering.
    console.error("Unhandled render error caught by ErrorBoundary:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-5">
          <div className="card max-w-md w-full text-center py-10">
            <AlertTriangle className="mx-auto text-rose mb-4" size={32} />
            <h2 className="font-display text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-mute mb-6">
              This page hit an unexpected error while rendering. You can try again, or head back
              and navigate here again.
            </p>
            <button onClick={this.handleRetry} className="btn-primary inline-flex">
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
