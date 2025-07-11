import { FiEdit2, FiTrash2, FiMoreVertical } from 'react-icons/fi';

export default function DataTable({ columns, data, rowActions }: { 
  columns: any[], 
  data: any[], 
  rowActions: string[] 
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th 
                key={column.key}
                className="px-4 py-3 text-left text-xs font-medium text-light uppercase tracking-wider"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {columns.map((column) => {
                if (column.key === 'actions') {
                  return (
                    <td key={column.key} className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {rowActions.includes('edit') && (
                          <button className="text-blue-600 hover:text-blue-900">
                            <FiEdit2 />
                          </button>
                        )}
                        {rowActions.includes('delete') && (
                          <button className="text-red-600 hover:text-red-900">
                            <FiTrash2 />
                          </button>
                        )}
                        <button className="text-gray-600 hover:text-gray-900">
                          <FiMoreVertical />
                        </button>
                      </div>
                    </td>
                  );
                }
                return (
                  <td 
                    key={column.key} 
                    className="px-4 py-3 whitespace-nowrap text-sm text-dark"
                  >
                    {row[column.key]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      
    </div>
  );
}