import { useEffect, useState } from 'react';
import InvalidTable from './components/InvalidTable';
import CommitModal from './components/CommitModal';
import * as XLSX from 'xlsx';
import { StudentData } from './Data/StudentData.js'; // Total DATA
import Navbar from './components/Navbar.jsx';

const App = () => {
  const token = import.meta.env.VITE_GIT_TOKEN; // GitHub token

  const [userCommitCounts, setUserCommitCounts] = useState({});
  const [invalidData, setInvalidData] = useState([]);
  const [commitsHistory, setCommitsHistory] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [lastFiveDaysCommits, setLastFiveDaysCommits] = useState({});
  const [weeklySummary, setWeeklySummary] = useState({});

  const [searchBranch, setSearchBranch] = useState('');
  const [searchSection, setSearchSection] = useState('');

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

            const commits = await response.json();
            // Count commits for each user
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
      
      // Calculate weekly summary
      calculateWeeklySummary(commitCounts);
    };

    fetchCommitsForAll();
  }, [token]);

  const calculateWeeklySummary = (commitCounts) => {
    const summary = {};
    const activeUsers = new Set();
  
    for (const student of StudentData) {
      const branch = student.Branch;
      const section = student.Section;
      const username = student.GitName;
      const commitsInLastFiveDays = lastFiveDaysCommits[username] || [];
  
      const totalCommits = commitCounts[username] || 0;
  
      // Update active users
      if (commitsInLastFiveDays.some(commit => commit.count > 0)) {
        activeUsers.add(username);
      }
  
      // Initialize branch and section in summary if not exists
      if (!summary[branch]) summary[branch] = {};
      if (!summary[branch][section]) {
        summary[branch][section] = { totalCommits: 0, activeUsers: 0, totalUsers: 0, activeUserPercentage: 0 };
      }
  
      // Update commits count for the branch and section
      summary[branch][section].totalCommits += totalCommits;
      if (commitsInLastFiveDays.some(commit => commit.count > 0)) {
        summary[branch][section].activeUsers += 1;
      }
  
      // Increment totalUsers for the section
      summary[branch][section].totalUsers += 1; // Count the user in totalUsers
    }
  
    // Calculate active user percentage for each section
    for (const branch in summary) {
      for (const section in summary[branch]) {
        const sectionSummary = summary[branch][section];
        const activeUsers = sectionSummary.activeUsers;
        const totalUsers = sectionSummary.totalUsers;
  
        // Calculate active user percentage
        sectionSummary.activeUserPercentage = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
      }
    }
  
    console.log(activeUsers.size);
    setWeeklySummary({
      totalActiveUsers: activeUsers.size,
      summary,
    });
  };
  
  
  // Function to download the full user commit count table in Excel format
  const downloadFullUserCommitCounts = () => {
    const wb = XLSX.utils.book_new();
  
    // Create header for user commit counts sheet
    const header = ['#', 'Name', 'Roll No', 'Username', 'Commits', 'Active', 'Branch', 'Section', ...Object.keys(lastFiveDaysCommits).flatMap(username =>
      lastFiveDaysCommits[username].map(({ date }) => date)
    )];
  
    const userCommitData = StudentData.map((student, index) => {
      const username = student.GitName;
      const totalCount = userCommitCounts[username] || 0;
  
      // Check if user has any commits in the last five days
      const commitsData = lastFiveDaysCommits[username] || [];
      const hasCommitsInLastFiveDays = commitsData.some(({ count }) => count > 0) ? 1 : 0; // Set 1 if active, otherwise 0
      const dailyCounts = commitsData.map(({ count }) => (count > 0 ? count : 'No Commit'));
  
      return [
        index + 1, 
        student.Name, 
        student.RollNo, 
        username, 
        totalCount, 
        hasCommitsInLastFiveDays, // Active column
        student.Branch, 
        student.Section, 
        ...dailyCounts
      ];
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
  
    // Create valid data sheet with similar structure to user commits sheet
    const validDataSheet = StudentData.filter(student => !invalidData.some(invalid => invalid.username === student.GitName))
      .map((student, index) => {
        const username = student.GitName;
        const totalCount = userCommitCounts[username] || 0;
    
        const commitsData = lastFiveDaysCommits[username] || [];
        const hasCommitsInLastFiveDays = commitsData.some(({ count }) => count > 0) ? 1 : 0;
        const dailyCounts = commitsData.map(({ count }) => (count > 0 ? count : 'No Commit'));
    
        return [
          index + 1,
          student.Name,
          student.RollNo,
          username,
          totalCount,
          hasCommitsInLastFiveDays,
          student.Branch,
          student.Section,
          ...dailyCounts
        ];
      });
  
    const validSheetData = [header, ...validDataSheet];
    const ws3 = XLSX.utils.aoa_to_sheet(validSheetData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Valid Repos');
  
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
      // console.log(commits);
      
      const lastFiveCommits = commits.slice(0, 5); // Get only the last five commits
      setCommitsHistory(lastFiveCommits);
      setSelectedUser(GitName);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching commit history:', error);
    }
  };
  

  // Filter the student data and invalid data based on the search criteria
  const filteredStudentData = StudentData.filter((student) => {
    return (
      (!searchBranch || student.Branch.toLowerCase().includes(searchBranch.toLowerCase())) &&
      (!searchSection || student.Section.toLowerCase() === searchSection.toLowerCase())
    );
  });

  const filteredInvalidData = invalidData.filter((data) => {
    return (
      (!searchBranch || data.branch.toLowerCase().includes(searchBranch.toLowerCase())) &&
      (!searchSection || data.section.toLowerCase() === searchSection.toLowerCase())
    );
  });

  const downloadFilteredUserCommitCounts = () => {
    const wb = XLSX.utils.book_new();
  
    // Create header for user commit counts sheet
    const header = ['#', 'Name', 'Roll No', 'Username', 'Commits', 'Active', 'Branch', 'Section', ...Object.keys(lastFiveDaysCommits).flatMap(username =>
      lastFiveDaysCommits[username].map(({ date }) => date)
    )];
  
    // Filtered user commit data based on search criteria (branch, section)
    const filteredUserCommitData = filteredStudentData.map((student, index) => {
      const username = student.GitName;
      const totalCount = userCommitCounts[username] || 0;
  
      // Check if user has any commits in the last five days
      const commitsData = lastFiveDaysCommits[username] || [];
      const hasCommitsInLastFiveDays = commitsData.some(({ count }) => count > 0) ? 1 : 0; // Set 1 if active, otherwise 0
      const dailyCounts = commitsData.map(({ count }) => (count > 0 ? count : 'No Commit'));
  
      return [
        index + 1, 
        student.Name, 
        student.RollNo, 
        username, 
        totalCount, 
        hasCommitsInLastFiveDays, // Active column
        student.Branch, 
        student.Section, 
        ...dailyCounts
      ];
    });
  
    const sheetData = [header, ...filteredUserCommitData];
    const ws1 = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Filtered User Commits'); // Shortened name
  
    // Filter invalid data based on search criteria
    const filteredInvalidData = invalidData.filter((data) => {
      return (
        (!searchBranch || data.branch.toLowerCase().includes(searchBranch.toLowerCase())) &&
        (!searchSection || data.section.toLowerCase() === searchSection.toLowerCase())
      );
    });
  
    // Create invalid data sheet with additional fields
    const invalidHeader = ['#', 'Name', 'Roll No.', 'Username', 'Repo', 'Error', 'Branch', 'Section'];
    const invalidDataSheet = filteredInvalidData.map((data, index) => [
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
    XLSX.utils.book_append_sheet(wb, ws2, 'Filtered Invalid Repos'); // Shortened name
  
    // Create valid data sheet with similar structure to user commits sheet
    const filteredValidData = filteredStudentData.filter(student => 
      !invalidData.some(invalid => invalid.username === student.GitName)
    ).map((student, index) => {
      const username = student.GitName;
      const totalCount = userCommitCounts[username] || 0;
  
      const commitsData = lastFiveDaysCommits[username] || [];
      const hasCommitsInLastFiveDays = commitsData.some(({ count }) => count > 0) ? 1 : 0;
      const dailyCounts = commitsData.map(({ count }) => (count > 0 ? count : 'No Commit'));
  
      return [
        index + 1,
        student.Name,
        student.RollNo,
        username,
        totalCount,
        hasCommitsInLastFiveDays,
        student.Branch,
        student.Section,
        ...dailyCounts
      ];
    });
  
    const validSheetData = [header, ...filteredValidData];
    const ws3 = XLSX.utils.aoa_to_sheet(validSheetData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Filtered Valid Repos');
  
    // Download the Excel file
    XLSX.writeFile(wb, 'Filtered_GitHub_User_Commit_Counts.xlsx');
  };
  
  

  return (
    <>
    <Navbar />
    <div className="bg-gray-100 p-10">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">GitHub Commits Viewer</h1>
  
      <div className="flex justify-center mb-6 space-x-4">
        <button
          onClick={downloadFullUserCommitCounts}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded transition duration-200 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
          </svg>
          Download Full User Commit Counts
        </button>
        <button
          onClick={downloadFilteredUserCommitCounts}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded transition duration-200 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
          </svg>
          Download Filtered User Commit Counts
        </button>
      </div>
  
      <h2 className="text-2xl font-semibold mb-4 text-gray-700">Total Entries: {StudentData.length}</h2>
  
      {/* Search inputs for Branch and Section */}

      {/* Display Weekly Summary */}
      <div className="mb-6 p-4 bg-white rounded shadow">
  <h2 className="text-xl font-bold text-gray-800">Weekly Summary</h2>
  <table className="min-w-full border-collapse">
    <thead>
      <tr className="bg-gray-100">
        <th className="border px-4 py-2 text-center ">Branch</th>
        <th className="border px-4 py-2 text-center">Section</th>
        <th className="border px-4 py-2 text-center">Active Users</th>
        <th className="border px-4 py-2 text-center">Total Users</th>
        <th className="border px-4 py-2 text-center">Active User Percentage</th>
      </tr>
    </thead>
    <tbody>
      {Object.keys(weeklySummary.summary || {}).map(branch => (
        Object.keys(weeklySummary.summary[branch] || {}).map(section => {
          const { activeUsers, totalUsers, activeUserPercentage } = weeklySummary.summary[branch][section];
          return (
            <tr key={`${branch}-${section}`}>
              <td className="border px-4 py-2 text-center">{branch}</td>
              <td className="border px-4 py-2 text-center">{section}</td>
              <td className="border px-4 py-2 text-center">{activeUsers}</td>
              <td className="border px-4 py-2 text-center">{totalUsers}</td>
              <td className="border px-4 py-2 text-center">{activeUserPercentage.toFixed(2)}%</td>
            </tr>
          );
        })
      ))}
    </tbody>
  </table>
</div>



      <div className="mb-6 flex flex-col md:flex-row md:space-x-4">
  {/* Search by Branch */}
  <div className="relative w-full md:w-1/2">
    <label htmlFor="searchBranch" className="sr-only">Search by Branch</label>
    <input
      type="text"
      id="search Branch"
      placeholder="Search by Branch (e.g., CSE, IT)"
      value={searchBranch}
      onChange={(e) => setSearchBranch(e.target.value)}
      className="p-3 border border-gray-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200 ease-in-out bg-white text-gray-700"
    />
    {searchBranch && (
      <button
        onClick={() => setSearchBranch('')}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
    )}
  </div>

  {/* Search by Section */}
  <div className="relative w-full md:w-1/2">
    <label htmlFor="searchSection" className="sr-only">Search by Section</label>
    <input
      type="text"
      id="search Section"
      placeholder="Search by Section (e.g., A, B)"
      value={searchSection}
      onChange={(e) => setSearchSection(e.target.value)}
      className="p-3 border border-gray-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200 ease-in-out bg-white text-gray-700"
    />
    {searchSection && (
      <button
        onClick={() => setSearchSection('')}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
    )}
  </div>
</div>

  
      <h2 className="text-2xl font-bold mb-4 text-gray-800">User Commit Table</h2>
      <div className="overflow-x-auto">
  <table className="table-auto border-collapse w-full">
    <thead className="bg-gray-700 text-white">
      <tr>
        <th className="px-4 py-2 border border-gray-400">#</th>
        <th className="px-4 py-2 border border-gray-400">Name</th>
        <th className="px-4 py-2 border border-gray-400">Roll No</th>
        <th className="px-4 py-2 border border-gray-400">Username</th>
        <th className="px-4 py-2 border border-gray-400">Commits</th>
        <th className="px-4 py-2 border border-gray-400">Branch</th>
        <th className="px-4 py-2 border border-gray-400">Section</th>
        <th className="px-4 py-2 border border-gray-400">Commit History</th>
      </tr>
    </thead>
    <tbody>
      {filteredStudentData.map((student, index) => {
        
        
        return(
        
        
        <tr key={student.RollNo} className="hover:bg-gray-200 text-black transition duration-200">
          <td className="px-4 py-2 border border-gray-300 text-center">{index + 1}</td>
          <td className="px-4 py-2 border border-gray-300 ">{student.Name}</td>
          <td className="px-4 py-2 border border-gray-300 ">{student.RollNo}</td>
          <td className="px-4 py-2 border border-gray-300 ">{student.GitName}</td>
          <td className="px-4 py-2 border border-gray-300 text-center">
            <span
              className="tooltip"
              data-tooltip={userCommitCounts[student.GitName] || 'No Commit'}
            >
              {userCommitCounts[student.GitName] || 'No Commit'}
            </span>
          </td>
          <td className="px-4 py-2 border border-gray-300 text-center">{student.Branch}</td>
          <td className="px-4 py-2 border border-gray-300 text-center">{student.Section}</td>
          <td className="px-4 py-2 border border-gray-300 text-center">
            <button
              onClick={() => fetchCommitHistory(student.GitName, student.Repo)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              View Commits
            </button>
          </td>
        </tr>
      )})}
    </tbody>
  </table>
</div>

  
      {/* Invalid Repos Section */}
      <h2 className="text-2xl font-bold mt-10 mb-4 text-gray-800">Invalid Repos</h2>
      <InvalidTable data={filteredInvalidData} />
    </div>
  
    {modalOpen && (
      <CommitModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        commits={commitsHistory}
        username={selectedUser}
      />
    )}
  </>
  
  );
};

export default App;
