import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import API_URL from "./config";

function MobileView() {

  const [question, setQuestion] =
    useState("");

  const [answer, setAnswer] =
    useState("");

  const [status, setStatus] =
    useState("Connecting...");

  const [logs, setLogs] =
    useState([]);

  const addLog = (message) => {

    console.log(message);

    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()} - ${message}`,
    ]);
  };

  useEffect(() => {

    const timer = setTimeout(() => {

      addLog(
        `Trying connection to ${API_URL}`
      );

    }, 0);

    const socket = io(API_URL, {

      transports: [
        "polling"
      ],

      reconnection: true,

      reconnectionAttempts:
        Infinity,

      reconnectionDelay:
        1000,

      timeout:
        20000,

      forceNew: true,
    });

    socket.on(
      "connect",
      () => {

        addLog(
          `CONNECTED: ${socket.id}`
        );

        setStatus(
          "Connected"
        );
      }
    );

    socket.on(
      "test-message",
      (data) => {

        addLog(
          `TEST EVENT: ${data.message}`
        );
      }
    );

    socket.on(
      "new-answer",
      (data) => {

        addLog(
          "NEW ANSWER RECEIVED"
        );

        setQuestion(
          data.transcript
        );

        setAnswer(
          data.answer
        );

        setStatus(
          "Receiving answers"
        );
      }
    );

    socket.on(
      "connect_error",
      (error) => {

        addLog(
          `CONNECT ERROR: ${error.message}`
        );

        console.log(error);

        setStatus(
          "Connection failed"
        );
      }
    );

    socket.on(
      "disconnect",
      (reason) => {

        addLog(
          `DISCONNECTED: ${reason}`
        );

        setStatus(
          "Disconnected"
        );
      }
    );

    return () => {

      clearTimeout(timer);

      addLog(
        "SOCKET CLOSED"
      );

      socket.disconnect();
    };

  }, []);

  return (

    <div className="min-h-screen bg-slate-950 text-white p-4">

      <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">

        <div className="text-center mb-8">

          <div className="flex justify-center mb-4">

            <div className="w-20 h-20 rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-4xl shadow-lg">
              📱
            </div>

          </div>

          <h1 className="text-4xl font-bold">
            InterviewPilot AI
          </h1>

          <p className="text-slate-400 mt-2">
            Mobile Live Answers
          </p>

        </div>

        <div className="text-center mb-8 text-xl">

          Status:
          <span className="text-cyan-400 font-bold ml-2">
            {status}
          </span>

        </div>

        <div className="mb-8">

          <h2 className="text-2xl font-bold mb-3">
            Interview Question
          </h2>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 min-h-[120px] text-lg leading-8">

            {
              question ||
              "Waiting for question..."
            }

          </div>

        </div>

        <div className="mb-8">

          <h2 className="text-2xl font-bold mb-3">
            AI Suggested Answer
          </h2>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 min-h-[250px] whitespace-pre-wrap text-lg leading-8">

            {
              answer ||
              "Waiting for answer..."
            }

          </div>

        </div>

        <div>

          <h2 className="text-2xl font-bold mb-3 text-yellow-400">
            Debug Logs
          </h2>

          <div className="bg-black border border-slate-700 rounded-xl p-4 h-[250px] overflow-y-auto text-sm">

            {
              logs.length === 0
                ? "No logs yet..."
                : logs.map(
                    (log, index) => (

                      <div
                        key={index}
                        className="mb-2 border-b border-slate-800 pb-2"
                      >
                        {log}
                      </div>
                    )
                  )
            }

          </div>

        </div>

      </div>

    </div>
  );
}

export default MobileView;