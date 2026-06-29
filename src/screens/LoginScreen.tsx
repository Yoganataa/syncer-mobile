import { YStack, XStack, Text, Input, Button, useTheme } from 'tamagui'
import { useState } from 'react'
import { Shield, Send, Loader2 } from 'lucide-react-native'
import { useAuth } from '../AuthContext'
import log from '../logger'

const loginLog = log.extend('Login')

export default function LoginScreen() {
  const theme = useTheme()
  const { requestOtp, verifyOtp } = useAuth()
  const [code, setCode] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRequestOtp = async () => {
    setLoading(true); setError(null)
    try { await requestOtp(); loginLog.debug('OTP sent'); setStep(2) }
    catch (e: unknown) {
      loginLog.error('request OTP failed:', (e as Error).message)
      setError(e instanceof Error ? e.message : 'Failed to request code.')
    }
    finally { setLoading(false) }
  }

  const handleVerify = async () => {
    if (code.length < 6) return
    setLoading(true); setError(null)
    try { await verifyOtp(code); loginLog.debug('OTP verified') }
    catch (e: unknown) {
      loginLog.error('verify OTP failed:', (e as Error).message)
      setError(e instanceof Error ? e.message : 'Invalid code. Please try again.')
    }
    finally { setLoading(false) }
  }

  return (
    <YStack flex={1} backgroundColor="$bg" justifyContent="center" alignItems="center" padding="$4">
      <YStack maxWidth={400} width="100%" alignItems="center">
        <YStack
          width={64} height={64} borderRadius={32}
          backgroundColor="$accentLight" justifyContent="center" alignItems="center"
          marginBottom="$4"
        >
          <Shield size={32} color={theme.accent?.val} />
        </YStack>
        <Text fontSize={28} fontWeight="700" color="$text" fontFamily="$heading" textAlign="center" marginBottom="$1">
          Syncer
        </Text>
        <Text fontSize={14} color="$textSecondary" textAlign="center" marginBottom="$8">
          Private access area
        </Text>

        <YStack
          width="100%"
          backgroundColor="$card" borderRadius="$6" padding="$5"
        >
          <Text fontSize={18} fontWeight="600" color="$text" marginBottom="$1">
            {step === 1 ? 'Authentication Required' : 'Enter Verification Code'}
          </Text>
          <Text fontSize={14} color="$textSecondary" marginBottom="$5">
            {step === 1
              ? 'Request a secure login code to be sent to your account.'
              : 'Check your messages for the 6-digit verification code.'}
          </Text>

          {error && (
            <Text
              fontSize={13} color="$destructive"
              backgroundColor="$destructiveLight" padding="$3" borderRadius="$3"
              marginBottom="$4"
            >
              {error}
            </Text>
          )}

          {step === 1 ? (
            <Button
              size="$5" height={48} backgroundColor="$accent" color="white"
              onPress={handleRequestOtp} disabled={loading} borderRadius="$5"
              icon={loading ? () => <Loader2 size={18} color="white" /> : () => <Send size={18} color="white" />}
            >
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </Button>
          ) : (
            <YStack gap="$4">
              <Input
                placeholder="Enter 6-digit code"
                value={code} onChangeText={setCode}
                keyboardType="number-pad" maxLength={6}
                textAlign="center" fontSize={18} autoFocus
                height={48}
                backgroundColor="$cardBorder" borderWidth={0} color="$text" placeholderTextColor="$textMuted" borderRadius="$4"
              />
              <Button
                size="$5" height={48} backgroundColor="$accent" color="white"
                onPress={handleVerify} disabled={loading || code.length < 6} borderRadius="$5"
                icon={loading ? () => <Loader2 size={18} color="white" /> : () => <Shield size={18} color="white" />}
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </Button>
              <Text
                fontSize={13} color="$textSecondary" textAlign="center" textDecorationLine="underline"
                onPress={() => { setStep(1); setError(null) }}
              >
                Didn't receive it? Request new code
              </Text>
            </YStack>
          )}
        </YStack>
      </YStack>
    </YStack>
  )
}
