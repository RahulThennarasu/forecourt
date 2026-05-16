import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches uncaught render errors anywhere below it and shows the error text
 * instead of an unstyled blank screen. Without this, a single throw in
 * `buildEntry` (or a malformed event payload) would unmount the whole tree
 * and leave the page visually empty — which is exactly the "screen went
 * white" failure mode we want to make impossible.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught:', error, info.componentStack);
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          className="h-full w-full flex items-center justify-center px-8"
          style={{ background: '#FFF5F5' }}
        >
          <div className="max-w-xl text-center">
            <p
              style={{
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: '1.5rem',
                fontWeight: 300,
                color: '#7A2E2E',
                marginBottom: 12,
              }}
            >
              Something rendered badly.
            </p>
            <pre
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: '0.75rem',
                color: '#4A1F1F',
                background: '#FFFFFF',
                border: '1px solid #F2D2D2',
                borderRadius: 8,
                padding: '12px 16px',
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: 220,
              }}
            >
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              type="button"
              onClick={this.reset}
              style={{
                marginTop: 16,
                fontFamily: 'PP Neue Montreal, sans-serif',
                fontSize: '0.8125rem',
                color: '#1E2A35',
                background: '#FFFFFF',
                border: '1px solid #E5E5E5',
                borderRadius: 6,
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              dismiss
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
