import { useState } from 'react';

const CommitModal = ({ isOpen, onClose, commits, username }) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filteredCommits, setFilteredCommits] = useState(commits);

  // Filter commits by date range

  
  const filterCommitsByDate = () => {
    if (fromDate && toDate) {
      const filtered = commits.filter(commit => {
        const commitDate = new Date(commit.commit.committer.date);
        return commitDate >= new Date(fromDate) && commitDate <= new Date(toDate);
      });
      setFilteredCommits(filtered);
    } else {
      setFilteredCommits(commits); // If no date range, show all commits
    }
  };

  // Reset filter and show all commits
  const resetFilter = () => {
    setFromDate('');
    setToDate('');
    setFilteredCommits(commits);
  };

  return isOpen ? (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
  <div className="bg-white p-8 rounded-lg shadow-lg w-11/12 md:w-1/2">
    <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Commit History for {username}</h2>

    {/* Date range filter inputs */}
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:gap-6">
      <div className="flex-1">
        <label htmlFor="fromDate" className="block font-medium mb-2">
          From:
        </label>
        <input
          type="date"
          id="fromDate"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border border-gray-300 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="YYYY-MM-DD"
        />
      </div>

      <div className="flex-1">
        <label htmlFor="toDate" className="block font-medium mb-2">
          To:
        </label>
        <input
          type="date"
          id="toDate"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border border-gray-300 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="YYYY-MM-DD"
        />
      </div>

      <div className="flex items-end gap-2">
        <button
          onClick={filterCommitsByDate}
          className="bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 hover:bg-blue-700"
        >
          Filter
        </button>
        <button
          onClick={resetFilter}
          className="bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 hover:bg-gray-700"
        >
          Reset
        </button>
      </div>
    </div>

    {/* Display filtered commits */}
    <div className="overflow-y-auto max-h-96">
      {filteredCommits.length > 0 ? (
        <ul className="list-disc pl-5 space-y-3">
          {filteredCommits.map((commit, index) => (
            <li key={index} className="hover:bg-gray-100 p-2 rounded transition-colors duration-200">
              <div>
                <span className="font-semibold text-gray-800">
                  {new Date(commit.commit.committer.date).toLocaleDateString()}:
                </span>{" "}
                {commit.commit.message}
              </div>
              <div className="text-sm text-gray-500">
                Committer: {commit.commit.committer.name}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600">No commits found for the selected date range.</p>
      )}
    </div>

    <button
      onClick={onClose}
      className="mt-6 bg-red-600 text-white py-2 px-4 rounded transition-colors duration-200 hover:bg-red-700"
    >
      Close
    </button>
  </div>
</div>

  ) : null;
};

export default CommitModal;
