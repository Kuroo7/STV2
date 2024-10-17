import React from 'react';

const InvalidTable = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto bg-white rounded-lg shadow-md border-collapse">
        <thead className="bg-gray-700 text-white">
          <tr>
            <th className="py-3 px-4 border border-gray-400">Serial No.</th>
            <th className="py-3 px-4 border border-gray-400">Name</th>
            <th className="py-3 px-4 border border-gray-400">Roll No.</th>
            <th className="py-3 px-4 border border-gray-400">Username</th>
            <th className="py-3 px-4 border border-gray-400">Branch</th>
            <th className="py-3 px-4 border border-gray-400">Section</th>
            <th className="py-3 px-4 border border-gray-400">Repo</th>
            <th className="py-3 px-4 border border-gray-400">Error</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-200 transition duration-200 border-b text-black border-gray-300">
                <td className="py-2 px-4 border border-gray-300 text-center">{index + 1}</td>
                <td className="py-2 px-4 border border-gray-300">{item.name}</td>
                <td className="py-2 px-4 border border-gray-300">{item.rollNo}</td>
                <td className="py-2 px-4 border border-gray-300">{item.username}</td>
                <td className="py-2 px-4 border border-gray-300 text-center">{item.branch}</td>
                <td className="py-2 px-4 border border-gray-300 text-center">{item.section}</td>
                <td className="py-2 px-4 border border-gray-300">{item.repo}</td>
                <td className="py-2 px-4 border border-gray-300 text-red-600">{item.error}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className="py-4 text-center text-gray-500">
                No invalid repos found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InvalidTable;
