import { logger, consoleTransport } from 'react-native-logs'
import { createMMKV } from 'react-native-mmkv'

const storage = createMMKV({ id: 'app-logs' })

function mmkvTransport(props: {
  msg: string
  rawMsg: unknown
  level: { severity: number; text: string }
  extension?: string | null
}) {
  const level = props.level.text.toUpperCase()
  const msg = typeof props.rawMsg === 'string' ? props.rawMsg : JSON.stringify(props.rawMsg)
  const timestamp = new Date().toISOString()
  const ns = props.extension ? `[${props.extension}] ` : ''
  const line = `${timestamp} [${level}] ${ns}${msg}\n`

  const existing = storage.getString('log-buffer') ?? ''
  storage.set('log-buffer', existing + line)
}

const log = logger.createLogger({
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
  severity: __DEV__ ? 'debug' : 'warn',
  transport: __DEV__ ? consoleTransport : mmkvTransport,
  transportOptions: __DEV__
    ? {
        colors: {
          debug: 'whiteBright',
          info: 'cyanBright',
          warn: 'yellowBright',
          error: 'redBright',
        },
      }
    : {},
  async: true,
  dateFormat: 'time',
  printLevel: true,
  printDate: true,
  enabled: true,
})

export default log
