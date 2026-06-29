import { Component } from 'react'
import { YStack, Text, Button, useTheme } from 'tamagui'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return <ErrorFallback error={this.state.error!} onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const theme = useTheme()
  return (
    <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center" padding="$6" gap="$4">
      <Text fontSize={28}>⚠</Text>
      <Text fontSize={18} fontWeight="600" color="$text" textAlign="center">Something went wrong</Text>
      <Text fontSize={13} color="$textSecondary" textAlign="center" maxWidth={300} numberOfLines={3}>
        {error.message || 'An unexpected error occurred'}
      </Text>
      <Button
        backgroundColor="$accent" color="white" borderRadius="$5"
        onPress={onRetry}
        marginTop="$2"
      >
        Try Again
      </Button>
    </YStack>
  )
}
