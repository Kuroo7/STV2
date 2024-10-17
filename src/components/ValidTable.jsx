
const ValidTable = ({ data }) => {
  return (
    <table className="min-w-full table-auto bg-white rounded-lg shadow-md mb-10">
      <thead>
        <tr className="bg-gray-200 text-gray-600 text-left">
          <th className="py-2 px-4">Username</th>
          <th className="py-2 px-4">Repository</th>
          <th className="py-2 px-4">Commit Message</th>
          <th className="py-2 px-4">Commit Date</th>
        </tr>
      </thead>
      <tbody>
        {data.map(({ username, repo, commits }) =>
          commits.map((commit, index) => (
            <tr key={`${username}-${repo}-${index}`} className="border-b">
              <td className="py-2 px-4">{username}</td>
              <td className="py-2 px-4">{repo}</td>
              <td className="py-2 px-4">{commit.commit.message}</td>
              <td className="py-2 px-4">{new Date(commit.commit.committer.date).toLocaleString()}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

export default ValidTable;
