import { useEffect, useState } from "react";
import {
  listKnowledgeBases,
  createKnowledgeBase,
  deleteKnowledgeBase,
  fetchFolderTree,
} from "../services/api";
import KnowledgeBaseEditor from "./KnowledgeBaseEditor";
import { flattenFilesWithPath } from "../utils/tree";

export default function KnowledgeBaseManager({ preselectedFileIds = [] }) {
  const [kbs, setKbs] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [allFiles, setAllFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilesOnInit, setSelectedFilesOnInit] =
    useState(preselectedFileIds);

  const loadKbs = () => {
    console.log("Loading knowledge bases..."); // Log when the loading starts
    listKnowledgeBases()
      .then((data) => {
        console.log("Knowledge bases loaded successfully:", data); // Log after successful load
        setKbs(data);
      })
      .catch((error) => {
        console.error("Error loading knowledge bases:", error); // Log if an error occurs
      });
  };

  const loadFiles = async () => {
    console.log("Fetching folder tree..."); // Log when the loading starts
    try {
      const tree = await fetchFolderTree();
      console.log("Folder tree fetched successfully:", tree); // Log after successful fetch
      const flattenedFiles = flattenFilesWithPath(tree);
      console.log("Files flattened:", flattenedFiles); // Log the flattened files
      setAllFiles(flattenedFiles);
    } catch (error) {
      console.error("Error fetching folder tree:", error); // Log if an error occurs
    }
  };

  useEffect(() => {
    loadKbs();
    loadFiles();
  }, []);

  const handleSave = async (name, fileIds) => {
    setLoading(true);
    await createKnowledgeBase(name, fileIds);
    setShowEditor(false);
    await loadKbs();
    setLoading(false);
  };

  const handleDelete = async (kbId) => {
    if (window.confirm("Delete this knowledge base?")) {
      await deleteKnowledgeBase(kbId);
      await loadKbs();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with action button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Your Knowledge Bases
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {preselectedFileIds.length > 0 &&
              `${preselectedFileIds.length} file${
                preselectedFileIds.length !== 1 ? "s" : ""
              } preselected`}
          </p>
        </div>
        <button
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-medium rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105"
          onClick={() => setShowEditor(true)}
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Create Knowledge Base
        </button>
      </div>

      {showEditor && (
        <KnowledgeBaseEditor
          onSave={handleSave}
          onCancel={() => setShowEditor(false)}
          allFiles={allFiles}
          existingFileIds={selectedFilesOnInit}
        />
      )}

      {/* Knowledge bases grid */}
      {kbs.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Knowledge Bases Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first knowledge base to get started organizing your
            files.
          </p>
          <button
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-medium rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105"
            onClick={() => setShowEditor(true)}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Create Your First Knowledge Base
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kbs.map((kb) => (
            <div
              key={kb.id}
              className="group relative bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-purple-300 overflow-hidden"
            >
              {/* Gradient top border */}
              <div className="h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>

              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                        {kb.name}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>
                        {kb.file_count} file{kb.file_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {/* Show file names */}
                    {kb.files && kb.files.length > 0 && (
                      <div className="mt-2 text-sm text-gray-500">
                        <p className="font-medium text-gray-700">Files:</p>
                        <ul className="list-disc pl-5">
                          {kb.files.map((file) => (
                            <li key={file.id}>{file.name}</li> // Adjust 'file.id' and 'file.name' based on your data structure
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Delete button - Made always visible for debugging */}
                  <button
                    className="opacity-100 transition-opacity duration-200 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg w-10 h-10 flex items-center justify-center border border-gray-300"
                    onClick={() => handleDelete(kb.id)}
                    title="Delete knowledge base"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-blue-500/0 group-hover:from-purple-500/5 group-hover:to-blue-500/5 transition-all duration-200 pointer-events-none"></div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <svg
              className="animate-spin w-5 h-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-gray-700 font-medium">
              Creating knowledge base...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
