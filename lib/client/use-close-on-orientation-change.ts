import { useEffect } from 'react'

/**
 * Custom hook to close a drawer/menu on device orientation change
 *
 * @param onClose - Callback function to close the drawer/menu
 *
 * @example
 * const [open, setOpen] = useState(false)
 * useCloseOnOrientationChange(() => setOpen(false))
 */
export function useCloseOnOrientationChange(onClose: () => void) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOrientationChange = () => {
        onClose()
      }

      window.addEventListener('orientationchange', handleOrientationChange)

      return () => {
        window.removeEventListener('orientationchange', handleOrientationChange)
      }
    }
  }, [onClose])
}
