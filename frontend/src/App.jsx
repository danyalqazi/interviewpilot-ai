import { useEffect, useRef, useState } from "react";
import axios from "axios";
import API_URL from "./config";

function App() {

  const [recording, setRecording] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("English");
  const [resumeName, setResumeName] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const recordingStartedRef = useRef(false);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  const uploadResume = async (event) => {

    try {

      const file = event.target.files[0];

      if (!file) {
        return;
      }

      const formData = new FormData();

      formData.append("resume", file);

      setStatus("Uploading resume...");

      await axios.post(
        `${API_URL}/api/upload-resume`,
        formData
      );

      setResumeName(file.name);

      setStatus("Resume uploaded successfully");

    } catch (error) {

      console.log(error);

      setStatus("Resume upload failed");
    }
  };

  const startInterview = async () => {

    try {

      const stream =
        await navigator.mediaDevices.getDisplayMedia({

          video: true,
          audio: true,
        });

      streamRef.current = stream;

      const audioTracks =
        stream.getAudioTracks();

      if (audioTracks.length === 0) {

        alert("Please enable Share tab audio");
        return;
      }

      const audioContext =
        new AudioContext();

      audioContextRef.current =
        audioContext;

      const source =
        audioContext.createMediaStreamSource(stream);

      const analyser =
        audioContext.createAnalyser();

      analyser.fftSize = 2048;

      source.connect(analyser);

      analyserRef.current = analyser;

      const mediaRecorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current =
        mediaRecorder;

      mediaRecorder.ondataavailable =
        (event) => {

          if (event.data.size > 0) {

            audioChunksRef.current.push(
              event.data
            );
          }
        };

      mediaRecorder.onstop =
        async () => {

          if (
            audioChunksRef.current.length === 0
          ) {
            return;
          }

          const audioBlob =
            new Blob(
              audioChunksRef.current,
              {
                type: "audio/webm",
              }
            );

          audioChunksRef.current = [];

          const formData =
            new FormData();

          formData.append(
            "audio",
            audioBlob,
            "interview.webm"
          );

          formData.append(
            "language",
            language
          );

          try {

            setLoading(true);

            setStatus(
              "Generating AI answer..."
            );

            const response =
              await axios.post(
                `${API_URL}/api/transcribe`,
                formData
              );

            setQuestion(
              response.data.transcript
            );

            setAnswer(
              response.data.answer
            );

            setStatus(
              "Waiting for interviewer..."
            );

          } catch (error) {

            console.log(error);

            setStatus("Upload failed");

          } finally {

            setLoading(false);

            recordingStartedRef.current = false;
          }
        };

      setRecording(true);

      setStatus(
        "Waiting for interviewer..."
      );

      setTimeout(() => {

        detectVoice();

      }, 500);

    } catch (error) {

      console.log(error);

      alert(error.message);
    }
  };

  const detectVoice = () => {

    const analyser =
      analyserRef.current;

    if (!analyser) {
      return;
    }

    const dataArray =
      new Uint8Array(
        analyser.frequencyBinCount
      );

    const checkVolume = () => {

      analyser.getByteFrequencyData(
        dataArray
      );

      let volume = 0;

      for (
        let i = 0;
        i < dataArray.length;
        i++
      ) {

        volume += dataArray[i];
      }

      volume =
        volume / dataArray.length;

      if (volume > 5) {

        if (
          !recordingStartedRef.current
        ) {

          recordingStartedRef.current = true;

          setStatus(
            "Interviewer speaking..."
          );

          mediaRecorderRef.current.start(150);
        }

        clearTimeout(
          silenceTimeoutRef.current
        );

        silenceTimeoutRef.current =
          setTimeout(
            () => {

              if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state === "recording"
              ) {

                setStatus(
                  "Processing answer..."
                );

                mediaRecorderRef.current.stop();
              }
            },
            600
          );
      }

      animationFrameRef.current =
        requestAnimationFrame(
          checkVolume
        );
    };

    checkVolume();
  };

  const stopInterview = () => {

    setRecording(false);

    setStatus("Stopped");

    cancelAnimationFrame(
      animationFrameRef.current
    );

    clearTimeout(
      silenceTimeoutRef.current
    );

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {

      mediaRecorderRef.current.stop();
    }

    if (
      audioContextRef.current
    ) {

      audioContextRef.current.close();
    }

    if (streamRef.current) {

      streamRef.current
        .getTracks()
        .forEach((track) =>
          track.stop()
        );
    }
  };

  useEffect(() => {

    return () => {

      stopInterview();
    };
  }, []);

  return (

    <div className="min-h-screen bg-slate-950 text-white flex justify-center items-center p-5">

      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl">

        <div className="text-center mb-10">

          <div className="flex justify-center mb-5">

            <div className="w-20 h-20 rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-4xl shadow-lg">
              🎯
            </div>

          </div>

          <h1 className="text-5xl font-extrabold tracking-wide text-white">
            InterviewPilot AI
          </h1>

          <p className="text-slate-400 mt-3 text-lg">
            Real-Time AI Interview Assistant
          </p>

        </div>

        <div className="mb-6">

          <label className="block mb-2 text-lg font-bold">
            Upload Resume / CV
          </label>

          <input
            type="file"
            accept=".pdf"
            onChange={uploadResume}
            className="w-full bg-slate-800 border border-slate-600 rounded-xl p-4"
          />

          {
            resumeName && (
              <div className="mt-3 text-green-400">
                Uploaded: {resumeName}
              </div>
            )
          }

        </div>

        <div className="mb-6">

          <label className="block mb-2 text-lg font-bold">
            Answer Language
          </label>

          <select
            value={language}
            onChange={(e) =>
              setLanguage(e.target.value)
            }
            className="w-full bg-slate-800 border border-slate-600 rounded-xl p-4 text-lg"
          >

            <option>English</option>
            <option>Urdu</option>
            <option>Hindi</option>
            <option>Punjabi</option>
            <option>Arabic</option>
            <option>French</option>
            <option>German</option>

          </select>

        </div>

        <div className="flex gap-4">

          <button
            onClick={startInterview}
            disabled={recording}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-900 p-4 rounded-xl text-xl font-bold transition-all"
          >
            🎧 Start Interview
          </button>

          <button
            onClick={stopInterview}
            className="flex-1 bg-red-600 hover:bg-red-700 p-4 rounded-xl text-xl font-bold transition-all"
          >
            ⛔ Stop
          </button>

        </div>

        <div className="mt-6 text-center text-xl">

          Status:
          <span className="font-bold text-cyan-400 ml-2">
            {status}
          </span>

        </div>

        <div className="mt-8">

          <h2 className="text-2xl font-bold mb-3">
            Interviewer Question
          </h2>

          <div className="bg-slate-800 p-5 rounded-xl min-h-[120px] text-lg leading-8 border border-slate-700">

            {
              question ||
              "Waiting for interviewer voice..."
            }

          </div>

        </div>

        <div className="mt-8">

          <h2 className="text-2xl font-bold mb-3">
            AI Suggested Answer
          </h2>

          <div className="bg-slate-800 p-5 rounded-xl min-h-[250px] whitespace-pre-wrap text-lg leading-8 border border-slate-700">

            {
              loading
                ? "Generating answer..."
                : answer ||
                  "AI answer will appear here..."
            }

          </div>

        </div>

      </div>

    </div>
  );
}

export default App;