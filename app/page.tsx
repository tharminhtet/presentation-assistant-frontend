"use client";

import { useState, useEffect, useRef, FormEvent } from "react";

function App() {
  const deckDivRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<any | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    const clientSideInitialization = async () => {
      // Dynamically import Reveal.js and its CSS
      const Reveal = (await import("reveal.js")).default;
      await import("reveal.js/dist/reveal.css");
      await import("reveal.js/dist/theme/black.css");

      // Initialize Reveal.js
      if (!deckRef.current && deckDivRef.current) {
        deckRef.current = new Reveal(deckDivRef.current, {
          transition: "slide",
          // other config options
        });

        await deckRef.current.initialize();
        // Place for event handlers and plugin setups
      }
    };

    clientSideInitialization();

    return () => {
      if (deckRef.current) {
        deckRef.current.destroy();
        deckRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await response.json();

      if (data.slide_action) {
        switch (data.slide_action.action) {
          case "next":
            deckRef.current?.next();
            break;
          case "previous":
            deckRef.current?.prev();
            break;
          case "jump":
            // New case to handle going to a specific slide number
            const slideNumber = parseInt(data.slide_action.page);
            if (!isNaN(slideNumber) && deckRef.current) {
              deckRef.current.slide(slideNumber - 1); // Reveal.js uses 0-based index
            } else {
              console.error("Invalid slide number:", data.slide_action.page);
            }
            break;
        }
      }

      // You can display the LLM's response if needed
      console.log("LLM response:", data.response);
    } catch (error) {
      console.error("Error:", error);
    }
    setInput("");
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
      <form
        onSubmit={handleSubmit}
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
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command..."
          style={{ marginRight: "10px" }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
