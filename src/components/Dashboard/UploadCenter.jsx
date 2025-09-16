// src/components/dashboard/UploadCenter.jsx
import React from "react";
import { Upload, AlertCircle, CheckCircle, Info } from "lucide-react";

export const UploadCenterHeader = () => (
  <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 px-8 py-6 border-b border-gray-200/60">
    <div className="flex items-center space-x-4">
      <div className="p-2 bg-green-100 rounded-xl">
        <Upload className="w-6 h-6 text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Upload Center</h2>
        <p className="text-sm text-gray-500 mt-1">
          Drag and drop files or click to browse
        </p>
      </div>
    </div>
  </div>
);

export const UploadPrompt = ({ selectedItems }) => {
  const getPromptContent = () => {
    if (selectedItems.length === 0) {
      return {
        title: "Select a Destination Folder",
        description:
          "Choose a folder from the file explorer to start uploading your files securely.",
        type: "info",
        tip: "Create a new folder first, then select it to organize your uploads",
      };
    }

    if (selectedItems.length > 1) {
      return {
        title: "Multiple Items Selected",
        description: "Please select exactly one folder to enable file uploads.",
        type: "warning",
        tip: "Click on a single folder in the file explorer",
      };
    }

    return {
      title: "Invalid Selection",
      description:
        "The selected item is not a folder. Please select a folder to upload files.",
      type: "error",
      tip: "Only folders can contain uploaded files",
    };
  };

  const { title, description, type, tip } = getPromptContent();

  const getIcon = () => {
    switch (type) {
      case "warning":
        return <AlertCircle className="w-10 h-10 text-amber-500" />;
      case "error":
        return <AlertCircle className="w-10 h-10 text-red-500" />;
      default:
        return <Info className="w-10 h-10 text-blue-500" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case "warning":
        return "border-amber-200 bg-amber-50 text-amber-800";
      case "error":
        return "border-red-200 bg-red-50 text-red-800";
      default:
        return "border-blue-200 bg-blue-50 text-blue-800";
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mb-8 shadow-lg">
          {getIcon()}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-600 leading-relaxed mb-8">{description}</p>

        <div className={`border-2 rounded-xl p-6 ${getColorClasses()}`}>
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-sm">Quick tip</p>
              <p className="text-sm mt-1 opacity-90">{tip}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UploadReadyState = ({
  selectedFolderId,
  onUpload,
  FileUpload,
}) => (
  <div className="flex-1 flex flex-col">
    <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <span className="text-green-900 font-bold text-lg">
            Ready to Upload
          </span>
          <p className="text-green-700 text-sm mt-1">
            Files will be uploaded to the selected folder
          </p>
        </div>
      </div>
    </div>

    <div className="flex-1">
      <FileUpload folderId={selectedFolderId} onUpload={onUpload} />
    </div>
  </div>
);
