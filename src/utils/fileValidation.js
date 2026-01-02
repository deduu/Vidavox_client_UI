// src/utils/fileValidation.js
const ALLOWED_FILE_TYPES = /\.pdf$|\.png$|\.jpe?g$|\.xls$|\.xlsx$/i;

export function validateFile(file, maxSizeMB) {
  if (!file) {
    return "No file selected";
  }

  // Check file size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return `File is too large (${sizeMB.toFixed(
      1
    )} MB). Max allowed is ${maxSizeMB} MB.`;
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.test(file.name || "")) {
    return "Unsupported file type. Allowed: PDF, PNG, JPG/JPEG, XLS, XLSX.";
  }

  return null; // No error
}
