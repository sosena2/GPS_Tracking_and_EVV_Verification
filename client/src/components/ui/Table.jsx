export default function Table({ columns, data, loading }) {
  if (loading) return (
    <div className="flex items-center justify-center py-16 text-sm text-gray-500">Loading...</div>
  )
  if (!data?.length) return (
    <div className="flex items-center justify-center py-16 text-sm text-gray-500">No records found.</div>
  )
  return (
    <div className="w-full">
      <div className="space-y-3 md:hidden">
        {data.map((row, index) => (
          <div key={row.id ?? index} className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
            <div className="space-y-3">
              {columns.map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {col.label}
                  </div>
                  <div className="text-sm text-right text-gray-300">
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
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
    </div>
  )
}