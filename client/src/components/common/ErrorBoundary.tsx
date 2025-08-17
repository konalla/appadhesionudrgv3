import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error details for debugging
    console.error('[ErrorBoundary] Component crashed:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      retryCount: this.retryCount,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });

    // Check if this is a tablet-specific crash
    const isTablet = /tablet|ipad|playbook|silk/i.test(navigator.userAgent) ||
                    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && window.innerWidth > 768);
    
    if (isTablet) {
      console.warn('[ErrorBoundary] Tablet-specific crash detected');
    }

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, {
        ...errorInfo,
        errorId: this.state.errorId,
        isTablet,
        retryCount: this.retryCount
      });
    }
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`[ErrorBoundary] Retry attempt ${this.retryCount}/${this.maxRetries}`);
      
      this.setState({
        hasError: false,
        error: null,
        errorId: ''
      });
    } else {
      console.warn('[ErrorBoundary] Maximum retry attempts reached');
    }
  };

  handleReload = () => {
    console.log('[ErrorBoundary] Reloading page as requested by user');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const isTablet = /tablet|ipad|playbook|silk/i.test(navigator.userAgent) ||
                      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && window.innerWidth > 768);

      return (
        <Card className="mx-auto max-w-md mt-8 border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-700">
              {isTablet ? 'Erreur sur tablette' : 'Une erreur est survenue'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 text-center">
              {isTablet ? (
                <div className="space-y-2">
                  <p>Votre tablette a rencontré un problème avec cette fonctionnalité.</p>
                  <p className="text-xs text-gray-500">
                    Cela peut être dû à une mémoire limitée ou à des ressources système insuffisantes.
                  </p>
                </div>
              ) : (
                <p>Une erreur inattendue s'est produite. Veuillez réessayer.</p>
              )}
            </div>

            {/* Error ID for support */}
            <div className="text-xs text-gray-400 text-center font-mono">
              ID: {this.state.errorId}
            </div>

            <div className="flex flex-col space-y-2">
              {this.retryCount < this.maxRetries ? (
                <Button 
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réessayer ({this.maxRetries - this.retryCount} tentatives restantes)
                </Button>
              ) : (
                <div className="text-center space-y-2">
                  <p className="text-sm text-red-600">Limite de tentatives atteinte</p>
                  <Button 
                    onClick={this.handleReload}
                    className="w-full"
                    variant="destructive"
                  >
                    Recharger la page
                  </Button>
                </div>
              )}
            </div>

            {/* Tablet-specific suggestions */}
            {isTablet && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <h4 className="text-sm font-medium text-amber-800 mb-1">
                  Conseils pour tablettes:
                </h4>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Fermez d'autres applications</li>
                  <li>• Redémarrez votre tablette</li>
                  <li>• Utilisez des images plus petites (&lt;2MB)</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;