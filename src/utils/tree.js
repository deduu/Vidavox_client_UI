/**
 * Flattens a tree into a list of all nodes (folders and files).
 */
export const flattenAllNodes = (nodes) => {
  const result = [];
  const traverse = (list) => {
    for (const item of list) {
      result.push(item);
      if (item.children) traverse(item.children);
    }
  };
  traverse(nodes);
  return result;
};

/**
 * Flattens only file nodes and includes fullPath based on folder nesting.
 */
export const flattenFilesWithPath = (nodes, path = "") =>
  nodes.flatMap((n) => {
    const fullPath = path ? `${path}/${n.name}` : n.name;
    if (n.type === "file") return [{ ...n, fullPath }];
    return flattenFilesWithPath(n.children || [], fullPath);
  });
