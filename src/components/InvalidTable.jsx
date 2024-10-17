import React from 'react';

const InvalidTable = ({ data }) => {
  return (
    <table className="min-w-full table-auto bg-white rounded-lg shadow-md">
      <thead>
        <tr className="bg-gray-200 text-gray-600 text-left">
          <th className="py-2 px-4">Serial No.</th>
          <th className="py-2 px-4">Name</th>
          <th className="py-2 px-4">Roll No.</th>
          <th className="py-2 px-4">Username</th>
          <th className="py-2 px-4">Branch</th>
          <th className="py-2 px-4">Section</th>
          <th className="py-2 px-4">Repo</th>
          <th className="py-2 px-4">Error</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index} className="border-b">
            <td className="py-2 px-4">{index + 1}</td>
            <td className="py-2 px-4">{item.name}</td>
            <td className="py-2 px-4">{item.rollNo}</td>
            <td className="py-2 px-4">{item.username}</td>
            <td className="py-2 px-4">{item.branch}</td>
            <td className="py-2 px-4">{item.section}</td>
            <td className="py-2 px-4">{item.repo}</td>
            <td className="py-2 px-4">{item.error}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default InvalidTable;
