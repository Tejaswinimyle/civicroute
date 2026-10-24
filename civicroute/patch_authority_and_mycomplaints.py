import os

def patch_authority_dashboard():
    path = r"c:\Users\hp\OneDrive\Desktop\civicroute\civicroute\src\pages\AuthorityDashboard.jsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read().replace("\r\n", "\n")

    # 1. Update loadComplaints to send auth token
    old_fetch = 'const response = await fetch("http://127.0.0.1:8000/complaints");'
    new_fetch = """const token = localStorage.getItem("civicroute_authority_token");
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        const response = await fetch("http://127.0.0.1:8000/complaints", { headers });"""
    assert old_fetch in code, "old_fetch not found in AuthorityDashboard.jsx"
    code = code.replace(old_fetch, new_fetch)

    # 2. Update updateStatus to send auth token & remarks
    old_update = """    const response = await fetch(
      `http://127.0.0.1:8000/complaints/${selectedComplaint.id}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      }
    );"""

    new_update = """    const token = localStorage.getItem("civicroute_authority_token");
    const response = await fetch(
      `http://127.0.0.1:8000/complaints/${selectedComplaint.id}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: newStatus,
          remarks: `Status updated to ${newStatus} by ${authority?.name || 'Officer'}.`,
          updated_by: authority?.name || "Officer"
        }),
      }
    );"""
    assert old_update in code, "old_update not found in AuthorityDashboard.jsx"
    code = code.replace(old_update, new_update)

    # 3. Update letter display to show final_letter and provide Print/Download button
    old_letter_box = """                <div className="flex items-center gap-2">

                  <FileText
                    size={17}
                    className="text-indigo-600"
                  />

                  <p className="text-sm font-bold text-slate-900">
                    Official Complaint Letter
                  </p>

                </div>

                <div className="mt-2 whitespace-pre-line rounded-xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm">
                  {selectedComplaint.letter ||
                    "No complaint letter available."}
                </div>"""

    new_letter_box = """                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText
                      size={17}
                      className="text-indigo-600"
                    />

                    <p className="text-sm font-bold text-slate-900">
                      Official Complaint Letter
                    </p>

                    {selectedComplaint.final_letter && selectedComplaint.final_letter !== selectedComplaint.letter && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Citizen Approved
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const printWindow = window.open("", "_blank");
                      if (printWindow) {
                        const content = selectedComplaint.final_letter || selectedComplaint.letter || "No complaint letter available.";
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>CivicRoute Official Letter - ${selectedComplaint.id}</title>
                              <style>
                                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                                .header { border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px; }
                                .title { font-size: 20px; font-weight: bold; color: #1e3a8a; }
                                .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
                                .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; }
                                .letter { white-space: pre-line; font-size: 14px; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <div class="title">CivicRoute &ndash; Official Complaint Letter</div>
                                <div class="sub">Municipal & Authority Dispatch Copy</div>
                              </div>
                              <div class="meta">
                                <strong>Complaint ID:</strong> ${selectedComplaint.id} &nbsp;|&nbsp;
                                <strong>Department:</strong> ${selectedComplaint.department} &nbsp;|&nbsp;
                                <strong>Priority:</strong> ${selectedComplaint.priority} &nbsp;|&nbsp;
                                <strong>Status:</strong> ${selectedComplaint.status}
                              </div>
                              <div class="letter">${content}</div>
                              <script>window.onload = function() { window.print(); };</script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FileText size={13} className="text-indigo-600" />
                    Download / Print Letter
                  </button>
                </div>

                <div className="mt-2 whitespace-pre-line rounded-xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm">
                  {selectedComplaint.final_letter || selectedComplaint.letter ||
                    "No complaint letter available."}
                </div>"""

    assert old_letter_box in code, "old_letter_box not found in AuthorityDashboard.jsx"
    code = code.replace(old_letter_box, new_letter_box)

    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Patched AuthorityDashboard.jsx successfully!")


def patch_my_complaints():
    path = r"c:\Users\hp\OneDrive\Desktop\civicroute\civicroute\src\pages\MyComplaints.jsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read().replace("\r\n", "\n")

    old_fetch = """        const response = await fetch(
          "http://127.0.0.1:8000/complaints"
        );"""

    new_fetch = """        const citizenToken = localStorage.getItem("civicroute_citizen_token");
        const headers = citizenToken ? { "Authorization": `Bearer ${citizenToken}` } : {};
        const response = await fetch(
          "http://127.0.0.1:8000/complaints",
          { headers }
        );"""

    assert old_fetch in code, "old_fetch not found in MyComplaints.jsx"
    code = code.replace(old_fetch, new_fetch)

    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Patched MyComplaints.jsx successfully!")

if __name__ == "__main__":
    patch_authority_dashboard()
    patch_my_complaints()

