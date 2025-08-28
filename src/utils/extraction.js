// src/utils/extraction.js
export function buildJsonStringFromResult(extractionResult) {
  try {
    return JSON.stringify(extractionResult ?? {}, null, 2);
  } catch {
    return "";
  }
}

export function buildMarkdownFromPages(pages) {
  const pageArray = Array.isArray(pages) ? pages : [];
  let combinedMarkdown = "";

  for (let i = 0; i < pageArray.length; i++) {
    const page = pageArray[i];
    const pageMd = page?.markdown;
    const pageText = page?.text;

    if (pageMd || pageText) {
      if (combinedMarkdown) {
        combinedMarkdown += "\n\n---\n\n";
      }
      combinedMarkdown += `# Page ${i + 1}\n\n` + (pageMd || pageText || "");
    }
  }

  return combinedMarkdown.trim();
}

export function calculateStats(extractionResult) {
  const pages = Array.isArray(extractionResult?.pages)
    ? extractionResult.pages
    : [];

  return {
    pages: pages.length,
    textBlocks: pages.reduce((acc, page) => {
      const elements = page?.elements || [];
      return acc + elements.filter((el) => el?.type === "text").length;
    }, 0),
    tables: pages.reduce((acc, page) => {
      const elements = page?.elements || [];
      return (
        acc +
        elements.filter(
          (el) =>
            el?.type === "image" && el?.image_metadata?.image_type === "table"
        ).length
      );
    }, 0),
    time: Number.isFinite(extractionResult?.processing_time)
      ? `${Math.round(extractionResult.processing_time)}s`
      : "—",
  };
}

export function formatBytes(bytes) {
  if (!bytes) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
