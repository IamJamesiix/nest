import { Component } from "react";

// catches crashes anywhere in the app and shows what broke, instead of a blank page
export default class ErrorBoundary extends Component {
  state = { error: null, stack: "" };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ stack: info?.componentStack || "" });
    console.error("Nest crashed:", error, info?.componentStack);
  }

  details() {
    const { error, stack } = this.state;
    return [
      `Message: ${error?.message}`,
      `Page: ${window.location.href}`,
      `Browser: ${navigator.userAgent}`,
      `Time: ${new Date().toISOString()}`,
      "",
      "Error stack:",
      error?.stack || "(none)",
      "",
      "Component stack:",
      stack.trim() || "(none)",
    ].join("\n");
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="panel p-7">
          <h1 className="h-serif text-3xl">Something went wrong on this page</h1>
          <p className="mt-2 text-mut">Copy the details below and send them to the Nest team, then try reloading.</p>
          <pre className="mt-5 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-sf2 p-4 text-xs leading-relaxed">{this.details()}</pre>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn btn-teal" onClick={() => navigator.clipboard?.writeText(this.details())}>
              Copy details
            </button>
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                // clears saved theme, login and compare list in case they caused it
                localStorage.clear();
                window.location.href = "/";
              }}
            >
              Reset and go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
