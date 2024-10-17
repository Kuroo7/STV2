import { useEffect, useState } from 'react';
import InvalidTable from './components/InvalidTable';
import CommitModal from './components/CommitModal';
import * as XLSX from 'xlsx';
// import { CS } from './Data/CS.js'; //CS DATA
import { StudentData } from './Data/StudentData.js'; //Total DATA

const App = () => {
  const token = import.meta.env.VITE_GIT_TOKEN; // GitHub token

  const [userCommitCounts, setUserCommitCounts] = useState({});
  const [invalidData, setInvalidData] = useState([]);
  const [commitsHistory, setCommitsHistory] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [lastFiveDaysCommits, setLastFiveDaysCommits] = useState({});

  useEffect(() => {
    const fetchCommitsForAll = async () => {
      const commitCounts = {};
      const invalidResults = [];
      const fiveDays = 5;
      const today = new Date();
      const lastFiveDays = [];

      // Calculate last five days' dates
      for (let i = 0; i < fiveDays; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        lastFiveDays.push(date.toISOString().split('T')[0]); // Format as YYYY-MM-DD
      }

      // Function to fetch commits for a batch of users
      const fetchBatchCommits = async (batch) => {
        const batchInvalidResults = [];
        for (const student of batch) {
          const username = student.GitName; // Use GitName for the username
          const repo = student.Repo || 'default-repo'; // Use Repo for the repo name

          try {
            const response = await fetch(`https://api.github.com/repos/${username}/${repo}/commits`, {
              headers: {
                Authorization: `token ${token}`,
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch ${username}/${repo}: ${response.statusText} (Status: ${response.status})`);
            }

// console.log(response);

            const commits = await response.json();
            // Count commits for each user
            console.log(commits);
            
            commitCounts[username] = (commitCounts[username] || 0) + commits.length;

            // Filter commits for the last 5 days
            const lastFiveDaysCommitsData = lastFiveDays.map(date => {
              const dailyCommits = commits.filter(commit => commit.commit.committer.date.startsWith(date));
              return {
                date,
                count: dailyCommits.length,
              };
            });

            setLastFiveDaysCommits(prev => ({ ...prev, [username]: lastFiveDaysCommitsData }));
          } catch (error) {
            // Collect invalid results with additional fields
            batchInvalidResults.push({ 
              username, 
              repo, 
              error: error.message,
              name: student.Name,
              rollNo: student.RollNo,
              branch: student.Branch,
              section: student.Section
            });
          }
        }
        return batchInvalidResults;
      };

      const batchSize = 10; // Number of concurrent requests to GitHub API
      const promises = [];
      for (let i = 0; i < StudentData.length; i += batchSize) {
        const batch = StudentData.slice(i, i + batchSize);
        promises.push(fetchBatchCommits(batch));
        
        // Wait for a short time to prevent hitting the rate limit
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay of 1 second
      }

      // Combine results from all batches
      for (const result of await Promise.all(promises)) {
        invalidResults.push(...result);
      }

      setUserCommitCounts(commitCounts);
      setInvalidData(invalidResults);
    };

    fetchCommitsForAll();
  }, [token]);

  // Function to download the full user commit count table in Excel format
  const downloadFullUserCommitCounts = () => {
    const wb = XLSX.utils.book_new();

    // Create user commit counts sheet
    const header = ['#', 'Name', 'Roll No', 'Username', 'Commits', 'Branch', 'Section', ...Object.keys(lastFiveDaysCommits).flatMap(username =>
      lastFiveDaysCommits[username].map(({ date }) => date)
    )];

    const userCommitData = StudentData.map((student, index) => {
      const username = student.GitName;
      const totalCount = userCommitCounts[username] || 0;
      const commitsData = lastFiveDaysCommits[username] || [];
      const dailyCounts = commitsData.map(({ count }) => (count > 0 ? count : 'No Commit'));

      return [index + 1, student.Name, student.RollNo, username, totalCount, student.Branch, student.Section, ...dailyCounts];
    });

    const sheetData = [header, ...userCommitData];
    const ws1 = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws1, 'User Commits'); // Shortened name

    // Create invalid data sheet with additional fields
    const invalidHeader = ['#', 'Name', 'Roll No.', 'Username', 'Repo', 'Error', 'Branch', 'Section'];
    const invalidDataSheet = invalidData.map((data, index) => [
      index + 1, // Serial No.
      data.name,
      data.rollNo,
      data.username,
      data.repo,
      data.error,
      data.branch,
      data.section,
    ]);
    const invalidSheetData = [invalidHeader, ...invalidDataSheet];
    const ws2 = XLSX.utils.aoa_to_sheet(invalidSheetData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Invalid Repos'); // Shortened name

    // Download the Excel file
    XLSX.writeFile(wb, 'GitHub_User_Commit_Counts.xlsx');
  };

  // Fetch commit history for the selected user
  const fetchCommitHistory = async (GitName, Repo) => {
    try {
      const response = await fetch(`https://api.github.com/repos/${GitName}/${Repo}/commits`, {
        headers: {
          Authorization: `token ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch commits for ${GitName}/${Repo}: ${response.statusText}`);
      }

      const commits = await response.json();
      // const lastFiveCommits = commits.slice(0, 5);
      const lastFiveCommits = commits;
      setCommitsHistory(lastFiveCommits);
      setSelectedUser(GitName);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching commit history:', error);
    }
  };

  return (
    <div className="bg-gray-100 p-10">
      <h1 className="text-3xl font-bold mb-6">GitHub Commits Viewer</h1>

      <button
        onClick={downloadFullUserCommitCounts}
        className="mb-6 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        Download Full User Commit Counts
      </button>

      <h2 className="text-xl font-semibold mb-4">Total Entries: {StudentData.length}</h2> {/* Display Total Number of Entries */}

      <h2 className="text-2xl font-semibold mb-4">User Commit Counts</h2>
      <table className="min-w-full table-auto bg-white rounded-lg shadow-md mb-10">
        <thead>
          <tr className="bg-gray-200 text-gray-600 text-left">
            <th className="py-2 px-4">Serial No.</th>
            <th className="py-2 px-4">Name</th>
            <th className="py-2 px-4">Roll No.</th>
            <th className="py-2 px-4">Username</th>
            <th className="py-2 px-4">Number of Commits</th>
            <th className="py-2 px-4">Branch</th>
            <th className="py-2 px-4">Section</th>
            <th className="py-2 px-4">Commits from Last 5 Days</th>
          </tr>
        </thead>
        <tbody>
          {StudentData.map((student, index) => {
            const username = student.GitName; // Use GitName as the username
            const count = userCommitCounts[username] || 0;
            const lastFiveCommits = lastFiveDaysCommits[username] || [];
            const commitDetails = lastFiveCommits.map(({ date, count }) => (
              <div className='text-black' key={date}>
                {date}: {count > 0 ? `${count} Commits` : 'No Commit'}
              </div>
            ));

            return (
              <tr key={username} className="border-b cursor-pointer text-black " onClick={() => fetchCommitHistory(username, student.Repo || 'default-repo')}>
                <td className="py-2 px-4">{index + 1}</td> {/* Serial No. */}
                <td className="py-2 px-4">{student.Name}</td>
                <td className="py-2 px-4">{student.RollNo}</td>
                <td className="py-2 px-4">{username}</td>
                <td className="py-2 px-4">{count}</td>
                <td className="py-2 px-4">{student.Branch}</td>
                <td className="py-2 px-4">{student.Section}</td>
                <td className="py-2 px-4">{commitDetails}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="text-2xl font-semibold mb-4 text-red-500">Invalid Repositories or Usernames</h2>
      <InvalidTable data={invalidData} />

      <CommitModal isOpen={modalOpen} onClose={() => setModalOpen(false)} commits={commitsHistory} username={selectedUser} />
    </div>
  );
};

export default App;
