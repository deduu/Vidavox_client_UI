import React from "react";

function DatabaseTab() {
  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-header bg-white py-3">
        <h5 className="fw-bold mb-0">
          <i className="fas fa-database text-primary me-2"></i> Database Records
        </h5>
      </div>
      <div className="card-body">
        <div className="alert alert-info rounded-3 border-0 shadow-sm">
          <i className="fas fa-info-circle me-2"></i> No records in the database yet.
        </div>
        <div className="table-responsive mb-4">
          <table className="table table-striped table-hover">
            <thead className="table-light">
              <tr>
                <th>Document Name</th>
                <th>Key</th>
                <th>Value</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Add dynamic data later */}
              <tr>
                <td colSpan="5" className="text-center text-muted">No data</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DatabaseTab;
