import { API_BASE_URL } from '@/lib/api'
import { Button } from '@/components/ui/button'

function GoogleIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.6-2.6C16.9 3 14.7 2 12 2 6.8 2 2.6 6.3 2.6 12S6.8 22 12 22c6.9 0 9.4-4.8 9.4-8.3 0-.6 0-1-.1-1.5H12z"
      />
    </svg>
  )
}

function MicrosoftIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

export function OAuthButtons({ disabled }) {
  const startOAuth = (provider) => {
    window.location.href = `${API_BASE_URL}/api/auth/oauth/${provider}/start`
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="glass"
        className="h-11 rounded-xl gap-2"
        onClick={() => startOAuth('google')}
        disabled={disabled}
      >
        <GoogleIcon />
        Google
      </Button>
      <Button
        type="button"
        variant="glass"
        className="h-11 rounded-xl gap-2"
        onClick={() => startOAuth('microsoft')}
        disabled={disabled}
      >
        <MicrosoftIcon />
        Microsoft
      </Button>
    </div>
  )
}
