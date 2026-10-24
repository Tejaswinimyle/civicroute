import { API_BASE_URL } from "../apiConfig";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  Info,
  MapPin,
  Mic,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";



const API_URL = API_BASE_URL;



export default function ReportComplaint() {

  const navigate = useNavigate();



  // ---------------------------------------------------------

  // FORM STATE

  // ---------------------------------------------------------



  const [description, setDescription] = useState("");

  const [location, setLocation] = useState("");

  const [affectedPeople, setAffectedPeople] = useState("");
  const [coordinates, setCoordinates] = useState(null);
const [isGettingLocation, setIsGettingLocation] = useState(false);
const [locationError, setLocationError] = useState("");
const [followUpAnswer, setFollowUpAnswer] = useState("");



  // ---------------------------------------------------------

  // AI STATE

  // ---------------------------------------------------------



  const [analyzed, setAnalyzed] = useState(false);

  const [analysis, setAnalysis] = useState(null);

  const [complaintLetter, setComplaintLetter] = useState("");
  const [originalGeneratedLetter, setOriginalGeneratedLetter] = useState("");
  const [isEditingLetter, setIsEditingLetter] = useState(false);
  const [draftLetter, setDraftLetter] = useState("");
const [rewrittenDescription, setRewrittenDescription] = useState("");
const [isRewriting, setIsRewriting] = useState(false);
const [rewriteApproved, setRewriteApproved] = useState(false);


  const [conversationQuestion, setConversationQuestion] = useState("");

  const [conversationField, setConversationField] = useState("");



  // ---------------------------------------------------------

  // OTHER STATE

  // ---------------------------------------------------------
const getCurrentLocation = () => {
  setLocationError("");

  if (!navigator.geolocation) {
    setLocationError("Location is not supported by this browser.");
    return;
  }

  setIsGettingLocation(true);

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      setCoordinates({ latitude, longitude });
      setLocationError("");
      setIsGettingLocation(false);
    },
    (error) => {
      console.error("Location error:", error);

      setLocationError(
        "Unable to get your location. Please allow location access or enter it manually."
      );

      setIsGettingLocation(false);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );
};


  const [selectedImage, setSelectedImage] = useState(null);



  const [isListening, setIsListening] = useState(false);

  const [voiceError, setVoiceError] = useState("");



  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCheckingConversation, setIsCheckingConversation] = useState(false);

  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);



  const [errorMessage, setErrorMessage] = useState("");



  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Live Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraFacingMode, setCameraFacingMode] = useState("environment");



  // ---------------------------------------------------------

  // RESET AI STATE

  // ---------------------------------------------------------



  const resetConversation = () => {
  setConversationQuestion("");
  setConversationField("");
  setComplaintLetter("");
  setOriginalGeneratedLetter("");
  setDraftLetter("");
  setIsEditingLetter(false);
  setRewrittenDescription("");
  setRewriteApproved(false);
};


  // ---------------------------------------------------------
  // AI ANALYSIS
  // ---------------------------------------------------------

  const analyzeComplaint = async () => {
    if (!description.trim() && !selectedImage) {
      return;
    }

    setErrorMessage("");
    setAnalyzed(false);
    setAnalysis(null);
    resetConversation();
    setIsAnalyzing(true);
    console.log("===== IMAGE ANALYSIS DEBUG =====");
    console.log("Description:", description);
    console.log("Image selected:", !!selectedImage);
    console.log("Image type:", selectedImage?.type);
    console.log("Image data length:", selectedImage?.data?.length);
    console.log("API URL:", API_URL);

    try {
      // STEP 1: Analyze complaint (text, image, or combined)
      const analyzeResponse = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description.trim(),
          image: selectedImage?.data || "",
        }),
      });

      if (!analyzeResponse.ok) {
        const errorBody = await analyzeResponse.json().catch(() => null);
        throw new Error(
          errorBody?.detail || "Complaint analysis failed. Please try again."
        );
      }

      const analyzeData = await analyzeResponse.json();
      const backendAnalysis = analyzeData.analysis;

      if (!backendAnalysis) {
        throw new Error("No analysis was returned by the backend.");
      }

      setAnalysis(backendAnalysis);
      setAnalyzed(true);

      // In Option 2 (image-only), if citizen had not typed anything, auto-fill the AI description
      let effectiveDescription = description.trim();
      if (!effectiveDescription && backendAnalysis.description) {
        effectiveDescription = backendAnalysis.description;
        setDescription(backendAnalysis.description);
      }

      // STEP 2: Check missing information
      const conversationResponse = await fetch(`${API_URL}/conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: effectiveDescription,
          location: location.trim(),
          affected_people: affectedPeople.trim(),
        }),
      });

      if (!conversationResponse.ok) {
        throw new Error("Conversation check failed.");
      }

      const conversationData = await conversationResponse.json();
      console.log("Conversation response:", conversationData);

      // AI still needs information
      if (!conversationData.complete) {
        const question =
          conversationData.question ||
          conversationData.next_question ||
          "Please provide more information about the complaint.";

        let nextField = conversationData.missing_field || "";
        if (!location.trim() && !nextField) {
          nextField = "location";
        } else if (!affectedPeople.trim() && !nextField) {
          nextField = "affected_people";
        }

        setConversationQuestion(question);
        setConversationField(nextField);
        return;
      }

      // Everything is available — use backendAnalysis (not stale `analysis` state)
      await generateComplaintLetter(backendAnalysis, effectiveDescription);
    } catch (error) {
      console.error("analyzeComplaint error:", error);
      setErrorMessage(
        error.message || "Unable to connect to CivicRoute AI. Please make sure the backend server is running."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ---------------------------------------------------------
  // GENERATE OFFICIAL LETTER
  // ---------------------------------------------------------

  const generateComplaintLetter = async (result = analysis, explicitDesc = null) => {
    const finalDesc =
      (explicitDesc && explicitDesc.trim()) ||
      description.trim() ||
      result?.description ||
      "";

    if (!result || !finalDesc) {
      return;
    }

    setErrorMessage("");
    setIsGeneratingLetter(true);

    try {
      const response = await fetch(`${API_URL}/generate-letter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issue: result.issue,
          department: result.department,
          description: finalDesc,
          location: location.trim() || "the reported area",
          affected_people:
            affectedPeople.trim() || "the affected residents",
          severity: result.severity,
        }),
      });

      if (!response.ok) {
        throw new Error("Letter generation failed.");
      }

      const data = await response.json();
      const generated = data.letter || "";
      setComplaintLetter(generated);
      setOriginalGeneratedLetter(generated);
      setDraftLetter(generated);
      setIsEditingLetter(false);
      setConversationQuestion("");
      setConversationField("");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "The complaint was analyzed, but the official letter could not be generated."
      );
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  // ---------------------------------------------------------
  // REWRITE COMPLAINT FOR REVIEW
  // ---------------------------------------------------------

  const rewriteComplaintForReview = async (result = analysis, explicitDesc = null) => {
    const finalDesc =
      (explicitDesc && explicitDesc.trim()) ||
      description.trim() ||
      result?.description ||
      "";

    if (!result || !finalDesc) {
      // Nothing to rewrite — skip straight to letter generation
      await generateComplaintLetter(result, explicitDesc);
      return;
    }

    setErrorMessage("");
    setIsRewriting(true);

    try {
      const response = await fetch(`${API_URL}/rewrite-complaint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: finalDesc,
        }),
      });

      if (!response.ok) {
        throw new Error("Complaint rewriting failed.");
      }

      const data = await response.json();
      const rewritten = data.rewritten_description || finalDesc;

      setRewrittenDescription(rewritten);
      setRewriteApproved(false);
      setConversationQuestion("");
      setConversationField("");
    } catch (error) {
      console.error("Rewrite error:", error);
      // Fallback: skip rewriting and go straight to letter generation
      await generateComplaintLetter(result, explicitDesc);
    } finally {
      setIsRewriting(false);
    }
  };

  // ---------------------------------------------------------
  // CHECK CONVERSATION
  // ---------------------------------------------------------

  const checkConversation = async () => {
    if (!analysis) {
      setErrorMessage("Please analyze your complaint first before continuing.");
      return;
    }

    if (!followUpAnswer.trim()) {
      return;
    }

    setErrorMessage("");
    setIsCheckingConversation(true);

    try {
      // Apply the follow-up answer to the correct local state variable
      // so subsequent calls carry the updated values
      let updatedLocation = location.trim();
      let updatedAffectedPeople = affectedPeople.trim();

      if (conversationField === "location") {
        updatedLocation = followUpAnswer.trim();
        setLocation(followUpAnswer.trim());
      } else if (conversationField === "affected_people") {
        updatedAffectedPeople = followUpAnswer.trim();
        setAffectedPeople(followUpAnswer.trim());
      }

      const activeDesc = description.trim() || analysis.description || "";

      const response = await fetch(`${API_URL}/conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: activeDesc,
          location: updatedLocation,
          affected_people: updatedAffectedPeople,
          follow_up_answer: followUpAnswer.trim(),
          missing_field: conversationField,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || "Conversation check failed. Please try again."
        );
      }

      const data = await response.json();
      console.log("Conversation response:", data);

      // Clear the answer input after a successful round
      setFollowUpAnswer("");

      // More information is needed
      if (!data.complete) {
        const question =
          data.question ||
          data.next_question ||
          "Please provide more information.";

        setConversationQuestion(question);
        setConversationField(data.missing_field || "");
        return;
      }

      // All required information collected — proceed to rewrite and review
      await rewriteComplaintForReview(analysis, activeDesc);
    } catch (error) {
      console.error("checkConversation error:", error);
      setErrorMessage(
        error.message || "Unable to check the complaint information. Please try again."
      );
    } finally {
      setIsCheckingConversation(false);
    }
  };



  // ---------------------------------------------------------

  // VOICE INPUT

  // ---------------------------------------------------------



  const handleVoiceInput = () => {

    setVoiceError("");



    const SpeechRecognition =

      window.SpeechRecognition ||

      window.webkitSpeechRecognition;



    if (!SpeechRecognition) {

      setVoiceError(

        "Voice input is not supported in this browser. Please use Chrome or type your complaint."

      );



      return;

    }



    if (isListening && recognitionRef.current) {

      recognitionRef.current.stop();

      return;

    }



    const recognition = new SpeechRecognition();



    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.lang = "en-IN";



    recognition.onstart = () => {

      setIsListening(true);

      setVoiceError("");

    };



    recognition.onresult = (event) => {

      const spokenText =

        event.results[0][0].transcript;



      setDescription((previous) => {

        if (!previous.trim()) {

          return spokenText;

        }



        return `${previous.trim()} ${spokenText}`;

      });



      setAnalyzed(false);

      setAnalysis(null);

      resetConversation();

    };



    recognition.onerror = (event) => {

      console.error(

        "Speech recognition error:",

        event.error

      );



      if (event.error === "not-allowed") {

        setVoiceError(

          "Microphone permission was denied. Please allow microphone access."

        );

      } else if (event.error === "no-speech") {

        setVoiceError(

          "No speech was detected. Please try speaking again."

        );

      } else {

        setVoiceError(

          "Voice input could not be started. Please try again."

        );

      }



      setIsListening(false);

    };



    recognition.onend = () => {

      setIsListening(false);

      recognitionRef.current = null;

    };



    recognitionRef.current = recognition;



    recognition.start();

  };



  // ---------------------------------------------------------

  // IMAGE UPLOAD

  // ---------------------------------------------------------



  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image size must be less than 10 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (!dataUrl || typeof dataUrl !== "string") {
        setErrorMessage("Image conversion failed. Please try a different photograph.");
        return;
      }

      setSelectedImage({
        name: file.name || "Captured Photo",
        type: file.type || "image/jpeg",
        data: dataUrl,
      });

      // Clear previous analysis to prepare for fresh AI inspection
      setAnalyzed(false);
      setAnalysis(null);
      resetConversation();
    };

    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      setErrorMessage("Failed to read the image file. Please try selecting the image again.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  // ---------------------------------------------------------
  // CAMERA STREAM AND SNAPSHOT
  // ---------------------------------------------------------

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setCameraError("");
  };

  const startCamera = async (facing = cameraFacingMode) => {
    setCameraError("");
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is not supported by your current browser or device. Please select 'Upload Photo' to attach an image."
      );
      setIsCameraOpen(true);
      return;
    }

    setIsCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError(
          "Camera permission was denied. Please allow camera permissions in your browser or device settings, or select 'Upload Photo' to choose an existing image."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera device was detected. Please use 'Upload Photo' instead.");
      } else {
        setCameraError(
          err.message || "Could not access the camera. Please use 'Upload Photo' instead."
        );
      }
    }
  };

  const switchCameraFacing = () => {
    const nextFacing = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    setSelectedImage({
      name: `Camera_Capture_${Date.now()}.jpg`,
      type: "image/jpeg",
      data: dataUrl,
    });

    setAnalyzed(false);
    setAnalysis(null);
    resetConversation();
    stopCamera();
  };

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // ---------------------------------------------------------
  // SUBMIT COMPLAINT
  // ---------------------------------------------------------

  const handleSubmit = async () => {
    if (!description.trim() && !selectedImage) {
      return;
    }

    console.log("Continue clicked");
console.log("Analysis:", analysis);
console.log("Follow-up answer:", followUpAnswer);
console.log("Missing field:", conversationField);

if (!analysis) {
  console.log("Stopped: analysis is missing");
  return;
}

    if (!complaintLetter) {
      await generateComplaintLetter(analysis);
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
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
      });

      if (!response.ok) {
        throw new Error("Complaint submission failed.");
      }

      const data = await response.json();
      
      const complaintId = data.complaint_id;

      // Save locally so existing tracking pages continue working
      const complaint = {
        id: complaintId,
        complaint_id: complaintId,
        issue: analysis.issue,
        department: analysis.department,
        severity: analysis.severity,
        priority: analysis.priority,
        description: finalDescription,
        location: location.trim() || "Not provided",
        letter: complaintLetter,
        status: data.status || "Submitted",
        date: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        image: selectedImage?.data || null,
      };

      const existingComplaints = JSON.parse(
        localStorage.getItem("civicroute_complaints") || "[]"
      );

      localStorage.setItem(
        "civicroute_complaints",
        JSON.stringify([
          complaint,
          ...existingComplaints,
        ])
      );

      navigate(`/complaints/${complaintId}`);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Complaint submission failed. Please make sure the CivicRoute backend is running."
      );
    } finally {
      setIsSubmitting(false);
    }
  };



  // ---------------------------------------------------------

  // UI

  // ---------------------------------------------------------



  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white px-6 py-8">

      <div className="mx-auto max-w-6xl">



        {/* HEADER */}

        <div className="mb-8 flex items-center justify-between">

          <button

            onClick={() =>

              navigate("/citizen/dashboard")

            }

            className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"

          >

            <ArrowLeft size={18} />

            Back to Dashboard

          </button>



          <div className="flex items-center gap-2">

            <Sparkles

              size={20}

              className="text-blue-600"

            />



            <span className="text-lg font-bold text-slate-800">

              AI Complaint Assistant

            </span>

          </div>

        </div>



        {/* ERROR */}

        {errorMessage && (

          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">

            {errorMessage}

          </div>

        )}



        {/* MAIN GRID */}

        <div className="grid gap-6 lg:grid-cols-2">



          {/* =================================================

              LEFT SIDE

          ================================================== */}



          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-5">
              <p className="text-sm font-semibold text-blue-600">STEP 1</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                Tell us about the problem
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose your preferred way to report: type your issue, upload or capture a photo, or provide both for enhanced AI accuracy.
              </p>
            </div>

            {/* INPUT METHOD INDICATOR */}
            <div className="mb-5 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  !selectedImage && description.trim()
                    ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <FileText size={13} />
                Text Report
              </span>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  selectedImage && !description.trim()
                    ? "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Camera size={13} />
                Photo Report (No typing required)
              </span>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  selectedImage && description.trim()
                    ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Sparkles size={13} />
                Combined (Photo + Notes)
              </span>
            </div>

            {/* DESCRIPTION */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  {selectedImage && !description.trim()
                    ? "Complaint Description (Optional with Photo)"
                    : "What is the problem?"}
                </label>
                {selectedImage && (
                  <span className="text-xs text-slate-400">
                    AI will auto-fill from photo
                  </span>
                )}
              </div>

              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setAnalyzed(false);
                  setAnalysis(null);
                  resetConversation();
                }}
                placeholder={
                  selectedImage
                    ? "Optional: Add any extra notes or landmarks, or leave blank to let AI describe the photograph..."
                    : "Example: There is a huge pothole near our school and people are having difficulty driving."
                }
                rows={selectedImage ? 5 : 7}
                className="w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* ACTION BUTTONS (PHOTO & VOICE) */}
            <div className="mt-4 flex flex-wrap gap-2.5">
              {/* TAKE PHOTO (CAMERA) */}
              <button
                type="button"
                onClick={() => startCamera()}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 shadow-sm"
              >
                <Camera size={17} className="text-blue-600" />
                Take Photo
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageChange}
              />

              {/* UPLOAD PHOTO (FILE PICKER) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 shadow-sm"
              >
                <Paperclip size={17} className="text-slate-500" />
                Upload Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={handleImageChange}
              />

              {/* VOICE */}
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  isListening
                    ? "border-red-200 bg-red-50 text-red-600"
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                <Mic
                  size={17}
                  className={
                    isListening ? "animate-pulse text-red-600" : "text-slate-500"
                  }
                />
                {isListening ? "Listening..." : "Speak"}
              </button>
            </div>

            {/* VOICE ERROR */}
            {voiceError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
                {voiceError}
              </div>
            )}

            {/* IMAGE PREVIEW */}
            {selectedImage && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5">
                <div className="flex items-start gap-3">
                  <img
                    src={selectedImage.data}
                    alt="Complaint"
                    className="h-20 w-20 rounded-xl border border-white object-cover shadow-sm"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Photo Attached
                      </span>
                      <p className="truncate text-xs font-semibold text-slate-700">
                        {selectedImage.name}
                      </p>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {!description.trim()
                        ? "Photo-only mode active. Click 'Analyze Photograph' to let Gemini Vision detect the problem and generate the description automatically."
                        : "Combined mode active. Both photo and your notes will be evaluated together."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setAnalyzed(false);
                      setAnalysis(null);
                      resetConversation();
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* LOCATION */}
            
{/* LOCATION */}
<div className="mt-5">
  <label className="mb-2 block text-sm font-semibold text-slate-700">
    Complaint Location
  </label>

  <div className="relative">
    <MapPin
      size={18}
      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
    />

    <input
      value={location}
      onChange={(e) => {
        setLocation(e.target.value);
        setComplaintLetter("");
      }}
      placeholder="Enter area, street, ward or landmark..."
      className="w-full rounded-2xl border border-slate-300 py-3.5 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />
  </div>

  <button
    type="button"
    onClick={getCurrentLocation}
    disabled={isGettingLocation}
    className="mt-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
  >
    <MapPin size={17} />

    {isGettingLocation
      ? "Detecting Location..."
      : coordinates
      ? "Location Captured"
      : "Use My Current Location"}
  </button>

  {coordinates && (
    <p className="mt-2 text-xs text-emerald-700">
      <CheckCircle2 size={14} className="mr-1 inline" />
      GPS captured: {coordinates.latitude.toFixed(6)},{" "}
      {coordinates.longitude.toFixed(6)}
    </p>
  )}

  {locationError && (
    <p className="mt-2 text-xs text-red-600">
      {locationError}
    </p>
  )}
</div>


            {/* AFFECTED PEOPLE */}
            {analyzed &&
              (conversationField === "affected_people" ||
                affectedPeople.trim() ||
                conversationQuestion.toLowerCase().includes("how many")) && (
                <div className="mt-5">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Approximately how many people or households are affected?
                  </label>
                  <input
                    value={affectedPeople}
                    onChange={(e) => {
                      setAffectedPeople(e.target.value);
                      setComplaintLetter("");
                    }}
                    placeholder="Example: Around 50 households"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              )}

            {/* ANALYZE BUTTON */}
            <button
              onClick={analyzeComplaint}
              disabled={(!description.trim() && !selectedImage) || isAnalyzing}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Sparkles size={18} />
              {isAnalyzing
                ? "AI Analyzing..."
                : selectedImage && !description.trim()
                ? "Analyze Photograph"
                : selectedImage && description.trim()
                ? "Analyze Photo & Notes"
                : "Analyze Complaint"}
              {!isAnalyzing && <ArrowRight size={18} />}
            </button>
          </div>

          {/* =================================================
              RIGHT SIDE
          ================================================== */}

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            {/* BEFORE ANALYSIS */}
            {!analyzed ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <Sparkles size={30} className="text-blue-600" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-slate-800">
                  AI analysis will appear here
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Type your problem, add a photograph, or do both. CivicRoute AI will understand the issue, assign the responsible department, and generate your official letter.
                </p>
              </div>
            ) : (
              <div>
                {/* ANALYSIS HEADER */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                      <CheckCircle2 size={23} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                        AI Analysis Complete
                      </p>
                      <h2 className="text-xl font-bold text-slate-900">
                        Complaint identified
                      </h2>
                    </div>
                  </div>

                  {analysis?.confidence && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        analysis.confidence === "High"
                          ? "bg-emerald-100 text-emerald-700"
                          : analysis.confidence === "Medium"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {analysis.confidence} Confidence
                    </span>
                  )}
                </div>

                {/* NOTICE IF ANY */}
                {analysis?.notice && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                    <Info size={16} className="shrink-0 text-amber-600" />
                    <span>{analysis.notice}</span>
                  </div>
                )}

                {/* ATTACHED PHOTO BADGE */}
                {selectedImage && (
                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-2.5">
                    <img
                      src={selectedImage.data}
                      alt="Analyzed"
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700">
                        Photograph Inspected
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {selectedImage.name}
                      </p>
                    </div>
                  </div>
                )}

                {/* ANALYSIS DETAILS */}
                <div className="mt-6 space-y-3">
                  {/* CATEGORY */}
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold text-blue-600">CATEGORY</p>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {analysis?.issue || "Civic Issue"}
                    </p>
                  </div>

                  {/* DEPARTMENT */}
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <p className="text-xs font-semibold text-indigo-600">
                      RESPONSIBLE DEPARTMENT
                    </p>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {analysis?.department || "General Civic Services"}
                    </p>
                  </div>

                  {/* PRIORITY */}
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-xs font-semibold text-amber-600">PRIORITY</p>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {analysis?.priority || "Medium"}
                    </p>
                  </div>

                  {/* SEVERITY */}
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <p className="text-xs font-semibold text-red-600">SEVERITY</p>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {analysis?.severity || "Medium"}
                    </p>
                  </div>
                </div>



                {/* =================================================

                    AI FOLLOW-UP QUESTION

                ================================================== */}



                {conversationQuestion && (

                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">



                    <div className="flex items-center gap-2">

                      <Sparkles

                        size={17}

                        className="text-blue-600"

                      />



                      <p className="text-xs font-bold uppercase tracking-wide text-blue-600">

                        CivicRoute AI

                      </p>

                    </div>



                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">

                      {conversationQuestion}

                    </p>



                    <input
  type="text"
  value={followUpAnswer}
  onChange={(e) => setFollowUpAnswer(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && followUpAnswer.trim() && !isCheckingConversation) {
      e.preventDefault();
      checkConversation();
    }
  }}
  placeholder="Type your answer here..."
  disabled={isCheckingConversation}
  className="mt-3 w-full rounded-xl border border-blue-200 bg-white p-3 text-sm text-slate-800 disabled:bg-slate-50"
/>


                    <button

                      onClick={checkConversation}

                      disabled={!followUpAnswer.trim() || isCheckingConversation}
                      

                      className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"

                    >

                      {isCheckingConversation ? "Processing..." : "Continue"}

                      <ArrowRight size={16} />

                    </button>



                  </div>

                )}

{/* =================================================
    AI REWRITTEN COMPLAINT - CITIZEN REVIEW
================================================== */}

{isRewriting && (
  <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
    <div className="flex items-center gap-3">
      <Sparkles size={20} className="animate-pulse text-blue-600" />
      <p className="text-sm font-semibold text-blue-700">
        AI is improving your complaint...
      </p>
    </div>
  </div>
)}

{rewrittenDescription && !isRewriting && (
  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/60 p-5">

    <div className="flex items-center gap-2">
      <Sparkles size={19} className="text-blue-600" />

      <h3 className="text-sm font-bold text-slate-900">
        AI Improved Complaint
      </h3>
    </div>

    <p className="mt-2 text-xs leading-5 text-slate-500">
      Review the professionally rewritten complaint below.
      You can edit it to correct anything before generating your
      official letter.
    </p>

    <label className="mb-2 mt-4 block text-sm font-semibold text-slate-700">
      Review and edit your complaint
    </label>

    <textarea
      value={rewrittenDescription}
      onChange={(e) => {
        setRewrittenDescription(e.target.value);
        setRewriteApproved(false);
        setComplaintLetter("");
      }}
      rows={6}
      className="w-full resize-y rounded-xl border border-slate-300 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    />

    <button
      type="button"
      onClick={() => {
        if (!rewrittenDescription.trim()) {
          setErrorMessage("Please enter your complaint description.");
          return;
        }

        setRewriteApproved(true);
        generateComplaintLetter(analysis, rewrittenDescription);
      }}
      disabled={!rewrittenDescription.trim() || isGeneratingLetter}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      <CheckCircle2 size={18} />

      {isGeneratingLetter
        ? "Generating Official Letter..."
        : "Approve Description & Generate Letter"}
    </button>

    <p className="mt-3 text-center text-xs text-slate-500">
      Your complaint will not be submitted until you review and submit it.
    </p>

  </div>
)}

                {/* =================================================

                    LETTER GENERATION

                ================================================== */}



                {isGeneratingLetter && (

                  <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">



                    <div className="flex items-center gap-3">



                      <Sparkles

                        size={19}

                        className="animate-pulse text-blue-600"

                      />



                      <p className="text-sm font-semibold text-blue-700">

                        Generating official complaint letter...

                      </p>



                    </div>



                  </div>

                )}



                {/* =================================================

                    OFFICIAL LETTER

                ================================================== */}



                {complaintLetter && (
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
                )}



                {/* =================================================

                    SUBMIT

                ================================================== */}



                {complaintLetter && (

                  <button

                    onClick={handleSubmit}

                    disabled={isSubmitting}

                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"

                  >

                    <Send size={18} />



                    {isSubmitting

                      ? "Submitting Complaint..."

                      : "Submit Complaint"}

                  </button>

                )}



              </div>

            )}



          </div>



        </div>

      </div>

    </div>

  );

}