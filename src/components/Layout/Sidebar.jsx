// src/components/Layout/Sidebar.jsx
import { useAuth } from "../../services/auth";

function Sidebar() {

   const { user, logout, initializing } = useAuth();
    /* During initial probe show nothing */
  if (initializing) return null;

  return (
    <nav className="col-md-3 col-lg-2 sidebar bg-dark text-white">
      <div className="text-center mb-4">
        {/* <img src="https://via.placeholder.com/150?text=Doc+Checker" alt="Logo" width="150" className="my-3" /> */}
        {/* <h4>Document Intelligence</h4> */}
      </div>

         {/* --- user card --- */}
      {user && (
        <div className="text-center mb-4" id="user-info">
          <div className="user-profile p-3 rounded">
            <div className="d-flex align-items-center justify-content-center mb-2">
              <i className="fas fa-user-circle fa-2x text-white me-2" />
              <div className="text-start">
                <h6 className="mb-0 fw-bold text-white" id="username_display">
                  {user.username}
                </h6>
                <div className="small text-light">
                  <i className="fas fa-coins me-1" />
                  <span id="credits_display">{user.credits}</span> Credits
                </div>
              </div>
            </div>
            <button
              id="btn-logout"
              className="btn btn-sm btn-outline-light w-100"
              onClick={logout}
            >
              <i className="fas fa-sign-out-alt me-1" /> Logout
            </button>
          </div>
        </div>
      )}

      <hr className="border-secondary" />

      <div className="nav-section mb-4">
        <h5 className="text-uppercase small text-secondary">Documents</h5>
        <ol className="nav flex-column">
          <li className="nav-item">
            <button className="nav-link text-white" data-bs-toggle="tab" data-bs-target="#docs-tab">
              <i className="fas fa-folder-open me-2"></i> Documents
            </button>
          </li>
        </ol>
      </div>

      <hr className="border-secondary" />

      <div className="nav-section mb-4">
        <h5 className="text-uppercase small text-secondary">Settings</h5>
        <form id="api-key-form" className="mb-3">
          <div className="mb-3">
            <label htmlFor="openai-api-key" className="form-label text-white">
              OpenAI API Key
            </label>
            <input type="password" className="form-control form-control-sm" id="openai-api-key" placeholder="Enter API key" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm w-100">Save</button>
        </form>

        <div className="accordion" id="advancedOptions">
          <div className="accordion-item bg-dark text-white border-0">
            <h2 className="accordion-header">
              <button className="accordion-button collapsed bg-dark text-white" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOptions">
                Advanced Options
              </button>
            </h2>
            <div id="collapseOptions" className="accordion-collapse collapse bg-dark text-white" data-bs-parent="#advancedOptions">
              <div className="accordion-body">
                <div className="mb-3">
                  <label htmlFor="chunkSize" className="form-label">Content Chunk Size</label>
                  <input type="range" className="form-range" min="500" max="4000" step="100" defaultValue="1500" id="chunkSize" />
                  <div className="d-flex justify-content-between">
                    <small>500</small>
                    <small id="chunkSizeValue">1500</small>
                    <small>4000</small>
                  </div>
                </div>
                <div className="mb-3">
                  <label htmlFor="llmModel" className="form-label">LLM Model</label>
                  <select className="form-select" id="llmModel" defaultValue="gpt-3.5-turbo">
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-secondary" />

      <div className="nav-section">
        <h5 className="text-uppercase small text-secondary">About</h5>
        <p className="small">
          This app uses LLMs to analyze document consistency and identify discrepancies across multiple documents.
        </p>
        <ul className="small mb-0">
          <li>Financial report verification</li>
          <li>Contract analysis</li>
          <li>Regulatory compliance checks</li>
          <li>Project documentation audits</li>
        </ul>
      </div>
    </nav>
  );
}

export default Sidebar;
