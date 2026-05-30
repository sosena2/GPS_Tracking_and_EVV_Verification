const styles = {
  approved:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning:     'bg-yellow-500/10  text-yellow-400  border-yellow-500/20',
  rejected:    'bg-red-500/10     text-red-400     border-red-500/20',
  fraud_alert: 'bg-red-700/20     text-red-300     border-red-700/30',
  active:      'bg-blue-500/10    text-blue-400    border-blue-500/20',
  completed:   'bg-gray-500/10    text-gray-400    border-gray-500/20',
  pending:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

export default function Badge({ status }) {
  const style = styles[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${style}`}>
      {status?.replace('_', ' ') || 'unknown'}
    </span>
  )
}