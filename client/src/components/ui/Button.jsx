import Spinner from './Spinner'

const variants = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white',
  danger:  'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  ghost:   'bg-transparent hover:bg-gray-800 text-gray-300',
  outline: 'border border-gray-700 hover:bg-gray-800 text-gray-300',
}

export default function Button({ children, variant = 'primary', loading, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}