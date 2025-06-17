import React, { useEffect } from "react";
import Tab from "bootstrap/js/dist/tab";

import DocumentsTab from "../components/Tabs/DocumentsTab";
import DatabaseTab from "../components/Tabs/DatabaseTab";

function Home() {
  useEffect(() => {
    // Bootstrap Tabs Initialization (if needed)
    const tabTriggers = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabTriggers.forEach((triggerEl) => {
      new Tab(triggerEl);
    });
  }, []);

  return (
    <>
      <h1 className="main-header">📊 Document Cross-Checker</h1>
      <p className="lead mb-4">Upload, organize and cross‑check your files—all in one place.</p>

      <ul className="nav nav-tabs mb-4" id="mainTabs" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className="nav-link active"
            id="docs-tab-btn"
            data-bs-toggle="tab"
            data-bs-target="#docs-tab"
            type="button"
            role="tab"
            aria-controls="docs-tab"
            aria-selected="true"
          >
            <i className="fas fa-folder-open text-primary me-2"></i> Documents
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className="nav-link"
            id="database-tab-btn"
            data-bs-toggle="tab"
            data-bs-target="#database-tab"
            type="button"
            role="tab"
            aria-controls="database-tab"
            aria-selected="false"
          >
            <i className="fas fa-database text-primary me-2"></i> Database
          </button>
        </li>
      </ul>

      <div className="tab-content" id="mainTabsContent">
        <div className="tab-pane fade show active" id="docs-tab" role="tabpanel" aria-labelledby="docs-tab-btn">
          <DocumentsTab />
        </div>
        <div className="tab-pane fade" id="database-tab" role="tabpanel" aria-labelledby="database-tab-btn">
          <DatabaseTab />
        </div>
      </div>
    </>
  );
}

export default Home;
