import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { env } from './lib/env'
import { applyTheme, useThemeStore } from './stores/ui'

async function bootstrap() {
  applyTheme(useThemeStore.getState().theme)

  if (env.useMocks) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ quiet: true })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
