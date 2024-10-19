"use client";

import { useState, useEffect, useRef } from "react";
import Reveal from "reveal.js";

function App() {
  const deckDivRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<any | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const clientSideInitialization = async () => {
      // Dynamically import Reveal.js and its CSS
      await import("reveal.js/dist/reveal.css");
      await import("reveal.js/dist/theme/black.css");

      // Initialize Reveal.js
      if (!deckRef.current && deckDivRef.current) {
        deckRef.current = new Reveal(deckDivRef.current, {
          transition: "slide",
          // other config options
        });

        await deckRef.current.initialize();
      }
    };

    clientSideInitialization();

    // Set up WebSocket connection
    wsRef.current = new WebSocket("ws://localhost:8000");

    wsRef.current.onopen = () => {
      console.log("WebSocket connection established");
    };

    wsRef.current.onmessage = (event) => {
      console.log("Received message from server:", event.data);
      const data = JSON.parse(event.data);
      if (data.type === "text") {
        setTranscript(data.content);
        handleSlideAction(data.content);
      }
      // Handle audio responses if needed
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      if (deckRef.current) {
        deckRef.current.destroy();
        deckRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleSlideAction = (content: string) => {
    if (content.includes("next slide")) {
      deckRef.current?.next();
    } else if (content.includes("previous slide")) {
      deckRef.current?.prev();
    } else if (content.includes("go to slide")) {
      const slideNumber = parseInt(content.match(/\d+/)?.[0] || "1");
      deckRef.current?.slide(slideNumber - 1);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      // Stop recording logic
    } else {
      setIsRecording(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
          if (
            event.data.size > 0 &&
            wsRef.current?.readyState === WebSocket.OPEN
          ) {
            const reader = new FileReader();
            reader.onload = () => {
              const base64Audio = reader.result?.toString().split(",")[1];
              wsRef.current?.send(
                JSON.stringify({
                  type: "audio",
                  audio: base64Audio,
                })
              );
            };
            reader.readAsDataURL(event.data);
          }
        };
        mediaRecorder.start(250); // Send audio chunks every 250ms
      } catch (error) {
        console.error("Error accessing microphone:", error);
        setIsRecording(false);
      }
    }
  };

  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <div className="reveal" ref={deckDivRef}>
        <div className="slides">
          <section>Slide 1</section>
          <section>Slide 2</section>
          <section>Slide 3</section>
          <section>Slide 4</section>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          zIndex: 1000,
          background: "rgba(0, 0, 0, 0.7)",
          padding: "10px",
          borderRadius: "5px",
        }}
      >
        <button onClick={toggleRecording}>
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
        <p>{transcript}</p>
      </div>
    </div>
  );
}

export default App;
