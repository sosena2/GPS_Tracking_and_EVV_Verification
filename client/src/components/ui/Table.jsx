export default function Table({ columns, data, loading }) {
  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-500 text-sm">Loading...</div>
  )
  if (!data?.length) return (
    <div className="flex items-center justify-center py-16 text-gray-500 text-sm">No records found.</div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-gray-800/50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4 text-gray-300">
                  {col.render ? col.render(row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}