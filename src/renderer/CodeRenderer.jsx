import { useMemo, useRef } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css"; // change style if you prefer
import { Copy } from "lucide-react";
import CodeBlock from "./CodeBlock";
/**
 * Highlights code using highlight.js (auto-detects if language is absent),
 * shows line numbers, and provides copy-all & per-line copy controls.
 */
// const CodeRenderer = ({ content, language }) => {
//   const preRef = useRef(null);

//   const { highlightedHtml, lines, detectedLang } = useMemo(() => {
//     const raw = String(content ?? "");
//     const lang = language?.trim();

//     let res;
//     try {
//       res = lang
//         ? hljs.highlight(raw, { language: lang, ignoreIllegals: true })
//         : hljs.highlightAuto(raw);
//     } catch {
//       // fallback: no highlighting
//       res = { value: hljs.escapeHTML(raw), language: lang || "plaintext" };
//     }

//     // Split highlighted HTML into lines (closing tags are inserted per line by hljs)
//     const htmlLines = res.value.split("\n");
//     const plainLines = raw.split("\n");

//     return {
//       highlightedHtml: res.value,
//       lines: htmlLines.map((html, i) => ({
//         html,
//         plain: plainLines[i] ?? "",
//         no: i + 1,
//       })),
//       detectedLang: res.language || lang || "plaintext",
//     };
//   }, [content, language]);

//   const copyAll = async () => {
//     try {
//       await navigator.clipboard.writeText(String(content ?? ""));
//     } catch (e) {
//       console.warn("Copy failed:", e);
//     }
//   };

//   const copyLine = async (text) => {
//     try {
//       await navigator.clipboard.writeText(text);
//     } catch (e) {
//       console.warn("Copy failed:", e);
//     }
//   };

//   return (
//     <div className="rounded-lg border bg-neutral-900 text-neutral-100 overflow-hidden">
//       {/* Header */}
//       <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
//         <div className="text-xs text-neutral-300">
//           {language || detectedLang || "code"}
//         </div>
//         <button
//           onClick={copyAll}
//           className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800 active:scale-[0.99] transition"
//           aria-label="Copy all code"
//         >
//           <Copy size={14} />
//           Copy all
//         </button>
//       </div>

//       {/* Body */}
//       <div className="relative">
//         <pre
//           ref={preRef}
//           className="hljs m-0 p-0 text-sm leading-6 overflow-x-auto"
//           // We render line-by-line below; keeping this pre for semantics/scrolling
//         >
//           <code className="block">
//             {lines.map(({ html, plain, no }) => (
//               <div
//                 key={no}
//                 className="group/code flex items-stretch hover:bg-neutral-800/40"
//               >
//                 {/* Gutter: line number */}
//                 <div className="select-none shrink-0 w-12 text-right pr-3 pl-3 md:pl-2 text-neutral-500 border-r border-neutral-800">
//                   <span className="tabular-nums">{no}</span>
//                 </div>

//                 {/* Code line (highlighted HTML) */}
//                 <div className="flex-1 px-3 py-[2px] overflow-x-auto">
//                   <span
//                     className="inline-block min-w-full"
//                     // eslint-disable-next-line react/no-danger
//                     dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
//                   />
//                 </div>

//                 {/* Per-line copy */}
//                 <div className="opacity-0 group-hover/code:opacity-100 transition pr-2 pl-2 flex items-center">
//                   <button
//                     onClick={() => copyLine(plain)}
//                     className="rounded px-2 py-1 text-[11px] border border-neutral-700 hover:bg-neutral-800"
//                     aria-label={`Copy line ${no}`}
//                     title="Copy line"
//                   >
//                     Copy
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </code>
//         </pre>
//       </div>
//     </div>
//   );
// };

// export default CodeRenderer;
const CodeRenderer = ({ content, language }) => (
  <CodeBlock code={content} language={language} />
);
export default CodeRenderer;
