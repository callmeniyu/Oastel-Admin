import { FiEdit2, FiTrash2, FiMoreVertical, FiCalendar } from "react-icons/fi";
import { ReactNode } from "react";

type Column = {
  key: string;
  label: string;
};

type DataRow = {
  [key: string]: ReactNode;
};

type ActionHandlers = {
  onEdit?: (row: DataRow) => void;
  onDelete?: (row: DataRow) => void;
  onBook?: (row: DataRow) => void;
  onMore?: (row: DataRow) => void;
  onToggleAvailability?: (row: DataRow) => void;
};

export default function DataTable({
  columns,
  data,
  rowActions,
  actionHandlers,
}: {
  columns: Column[];
  data: DataRow[];
  rowActions: string[];
  actionHandlers?: ActionHandlers;
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
                // Handle availability toggle column
                if (column.key === "availability") {
                  const isAvailable = row.isAvailable as boolean;
                  return (
                    <td
                      key={column.key}
                      className="px-4 py-3 whitespace-nowrap"
                    >
                      <button
                        onClick={() =>
                          actionHandlers?.onToggleAvailability?.(row)
                        }
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          isAvailable
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                        title={
                          isAvailable ? "Click to disable" : "Click to enable"
                        }
                      >
                        {isAvailable ? "Active" : "Inactive"}
                      </button>
                    </td>
                  );
                }

                if (column.key === "actions") {
                  return (
                    <td
                      key={column.key}
                      className="px-4 py-3 whitespace-nowrap"
                    >
                      <div className="flex items-center space-x-2">
                        {rowActions.includes("book") && (
                          <button
                            onClick={() => actionHandlers?.onBook?.(row)}
                            className="text-green-600 hover:text-green-900"
                            title="Book Package"
                          >
                            <FiCalendar />
                          </button>
                        )}
                        {rowActions.includes("edit") && (
                          <button
                            onClick={() => actionHandlers?.onEdit?.(row)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <FiEdit2 />
                          </button>
                        )}
                        {rowActions.includes("delete") && (
                          <button
                            onClick={() => actionHandlers?.onDelete?.(row)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                        <button
                          onClick={() => actionHandlers?.onMore?.(row)}
                          className="text-gray-600 hover:text-gray-900"
                          title="More actions"
                        >
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
