import os

PATH = r"c:\Users\hp\OneDrive\Desktop\civicroute\civicroute\src\pages\ReportComplaint.jsx"

with open(PATH, "r", encoding="utf-8") as f:
    code = f.read().replace("\r\n", "\n")

# 1. State addition
old_state = """  const [complaintLetter, setComplaintLetter] = useState("");
const [rewrittenDescription, setRewrittenDescription] = useState("");"""

new_state = """  const [complaintLetter, setComplaintLetter] = useState("");
  const [originalGeneratedLetter, setOriginalGeneratedLetter] = useState("");
  const [isEditingLetter, setIsEditingLetter] = useState(false);
  const [draftLetter, setDraftLetter] = useState("");
const [rewrittenDescription, setRewrittenDescription] = useState("");"""

assert old_state in code, "State target not found"
code = code.replace(old_state, new_state)

# 2. resetConversation
old_reset = """  const resetConversation = () => {
  setConversationQuestion("");
  setConversationField("");
  setComplaintLetter("");
  setRewrittenDescription("");
  setRewriteApproved(false);
};"""

new_reset = """  const resetConversation = () => {
  setConversationQuestion("");
  setConversationField("");
  setComplaintLetter("");
  setOriginalGeneratedLetter("");
  setDraftLetter("");
  setIsEditingLetter(false);
  setRewrittenDescription("");
  setRewriteApproved(false);
};"""

assert old_reset in code, "Reset target not found"
code = code.replace(old_reset, new_reset)

# 3. generateComplaintLetter update
old_gen = """      const data = await response.json();
      setComplaintLetter(data.letter || "");
      setConversationQuestion("");
      setConversationField("");"""

new_gen = """      const data = await response.json();
      const generated = data.letter || "";
      setComplaintLetter(generated);
      setOriginalGeneratedLetter(generated);
      setDraftLetter(generated);
      setIsEditingLetter(false);
      setConversationQuestion("");
      setConversationField("");"""

assert old_gen in code, "Generate letter target not found"
code = code.replace(old_gen, new_gen)

# 4. handleSubmit update
old_submit = """    try {
      const finalDescription =
  rewriteApproved && rewrittenDescription.trim()
    ? rewrittenDescription.trim()
    : description.trim() || analysis.description || "Civic complaint";

      const response = await fetch(`${API_URL}/complaints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issue: analysis.issue,
          department: analysis.department,
          severity: analysis.severity,
          priority: analysis.priority,
          description: finalDescription,
          location: location.trim() || "Not provided",
          letter: complaintLetter,
          image: selectedImage?.data || "",
          latitude: coordinates?.latitude ?? null,
longitude: coordinates?.longitude ?? null,
        }),
      });"""

new_submit = """    try {
      const loggedCitizen = JSON.parse(
        localStorage.getItem("civicroute_logged_in_citizen") || "null"
      );
      const citizenToken = localStorage.getItem("civicroute_citizen_token");

      const finalDescription =
        rewriteApproved && rewrittenDescription.trim()
          ? rewrittenDescription.trim()
          : description.trim() || analysis.description || "Civic complaint";

      const response = await fetch(`${API_URL}/complaints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(citizenToken ? { "Authorization": `Bearer ${citizenToken}` } : {})
        },
        body: JSON.stringify({
          issue: analysis.issue,
          department: analysis.department,
          severity: analysis.severity,
          priority: analysis.priority,
          description: description.trim() || analysis.description || "Civic complaint",
          rewritten_description: rewrittenDescription.trim() || "",
          approved_description: finalDescription,
          location: location.trim() || "Not provided",
          letter: originalGeneratedLetter || complaintLetter,
          final_letter: complaintLetter,
          image: selectedImage?.data || "",
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
          citizen_name: loggedCitizen?.name || null,
          citizen_email: loggedCitizen?.email || null,
          citizen_phone: loggedCitizen?.phone || null,
        }),
      });"""

assert old_submit in code, "Submit target not found"
code = code.replace(old_submit, new_submit)

# 5. Letter UI display & editing workflow
old_letter_ui = """                {complaintLetter && (

                  <div className="mt-6">



                    <div className="mb-3 flex items-center gap-2">



                      <FileText

                        size={18}

                        className="text-blue-600"

                      />



                      <h3 className="text-sm font-bold text-slate-800">

                        Official Complaint Letter

                      </h3>



                    </div>



                    <div className="max-h-80 overflow-y-auto whitespace-pre-line rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">

                      {complaintLetter}

                    </div>



                  </div>

                )}"""

new_letter_ui = """                {complaintLetter && (
                  <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-800">
                          Official Complaint Letter
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {originalGeneratedLetter && originalGeneratedLetter !== complaintLetter && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Citizen Edited
                          </span>
                        )}

                        {!isEditingLetter ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setDraftLetter(complaintLetter);
                                setIsEditingLetter(true);
                              }}
                              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                              <Sparkles size={13} />
                              Edit Letter
                            </button>

                            {originalGeneratedLetter && originalGeneratedLetter !== complaintLetter && (
                              <button
                                type="button"
                                onClick={() => {
                                  setComplaintLetter(originalGeneratedLetter);
                                  setDraftLetter(originalGeneratedLetter);
                                }}
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!draftLetter.trim()) {
                                  alert("Complaint letter cannot be empty.");
                                  return;
                                }
                                setComplaintLetter(draftLetter.trim());
                                setIsEditingLetter(false);
                              }}
                              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                            >
                              <CheckCircle2 size={13} />
                              Save Changes
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsEditingLetter(false)}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditingLetter ? (
                      <div className="rounded-2xl border-2 border-blue-400 bg-white p-4 shadow-sm">
                        <p className="mb-2 text-xs font-medium text-blue-700">
                          You have full control. Modify subject, recipient, issue details, or formal request before submission:
                        </p>
                        <textarea
                          value={draftLetter}
                          onChange={(e) => setDraftLetter(e.target.value)}
                          rows={12}
                          className="w-full resize-y rounded-xl border border-slate-200 p-3 font-sans text-sm leading-6 text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto whitespace-pre-line rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                        {complaintLetter}
                      </div>
                    )}
                  </div>
                )}"""

assert old_letter_ui in code, "Letter UI target not found"
code = code.replace(old_letter_ui, new_letter_ui)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(code)

print("ReportComplaint.jsx successfully patched with Letter Editing workflow!")

