// CommitModal.js
import React, { useEffect, useRef } from 'react';

const CommitModal = ({ isOpen, onClose, commits, username }) => {
  const modalRef = useRef(); // Create a reference for the modal content

  // Close modal when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
      <div
        ref={modalRef} // Attach the ref to the modal content
        className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full"
      >
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-600 hover:text-red-600 text-2xl transition duration-200 ease-in-out"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center">Commit History for {username}</h2>

        {/* Scrollable Commit History */}
        <div className="overflow-y-auto max-h-72">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-200 text-gray-600 text-left">
                <th className="py-2 px-4 border-b">Commit Message</th>
                <th className="py-2 px-4 border-b">Commit Date</th>
              </tr>
            </thead>
            <tbody>
              {commits.length > 0 ? (
                commits.map((commit) => (
                  <tr key={commit.sha} className="border-b hover:bg-gray-100">
                    <td className="py-2 px-4">{commit.commit.message}</td>
                    <td className="py-2 px-4">{new Date(commit.commit.committer.date).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="py-2 px-4 text-center">No commits found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CommitModal;
