import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import multer from "multer";
import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();

const server =
  http.createServer(app);

const io =
  new Server(server, {

    cors: {

      origin: "*",

      methods: [
        "GET",
        "POST"
      ],
    },

    transports: [
      "polling"
    ],
  });

app.use(
  cors({

    origin: "*",

    methods: [
      "GET",
      "POST"
    ],

    credentials: true,
  })
);

app.use(express.json());

const groq =
  new Groq({
    apiKey:
      process.env.GROQ_API_KEY,
  });

let resumeText = "";

const storage =
  multer.diskStorage({

    destination:
      function (
        req,
        file,
        cb
      ) {

        let folder =
          "uploads/";

        if (
          file.fieldname ===
          "resume"
        ) {

          folder =
            "resumes/";
        }

        cb(
          null,
          folder
        );
      },

    filename:
      function (
        req,
        file,
        cb
      ) {

        const ext =
          path.extname(
            file.originalname
          );

        cb(
          null,
          Date.now() +
            ext
        );
      },
  });

const upload =
  multer({
    storage,
  });

io.on(
  "connection",
  (socket) => {

    console.log(
      "MOBILE CONNECTED:",
      socket.id
    );

    socket.emit(
      "test-message",
      {
        message:
          "Backend connected successfully",
      }
    );

    console.log(
      "TEST MESSAGE SENT"
    );

    socket.on(
      "disconnect",
      (reason) => {

        console.log(
          "MOBILE DISCONNECTED:",
          reason
        );
      }
    );
  }
);

app.get(
  "/test",
  (req, res) => {

    console.log(
      "TEST API HIT"
    );

    res.json({

      success: true,

      message:
        "Backend reachable from mobile",
    });
  }
);

app.post(
  "/api/upload-resume",
  upload.single("resume"),
  async (
    req,
    res
  ) => {

    try {

      const dataBuffer =
        fs.readFileSync(
          req.file.path
        );

      const pdf =
        await pdfjsLib.getDocument({
          data:
            new Uint8Array(
              dataBuffer
            ),
        }).promise;

      let extractedText = "";

      for (
        let i = 1;
        i <= pdf.numPages;
        i++
      ) {

        const page =
          await pdf.getPage(i);

        const content =
          await page.getTextContent();

        const strings =
          content.items.map(
            item => item.str
          );

        extractedText +=
          strings.join(" ");
      }

      extractedText =
        extractedText
          .replace(/\s+/g, " ")
          .trim();

      const profileResponse =
        await groq.chat.completions.create({

          model:
            "llama-3.1-8b-instant",

          messages: [

            {
              role:
                "system",

              content:
`
Convert this resume into a short candidate profile for interviews.
Keep it natural and concise.
`,
            },

            {
              role:
                "user",

              content:
                extractedText,
            },
          ],

          temperature:
            0.2,

          max_tokens:
            350,
        });

      resumeText =
        profileResponse
          .choices[0]
          .message
          .content;

      console.log(
        "RESUME PROFILE GENERATED"
      );

      res.json({
        success: true,
      });

    } catch (error) {

      console.log(error);

      res.status(500)
        .json({

          error:
            error.message,
        });
    }
  }
);

app.post(
  "/api/transcribe",
  upload.single("audio"),
  async (
    req,
    res
  ) => {

    try {

      const transcription =
        await groq.audio.transcriptions.create({

          file:
            fs.createReadStream(
              req.file.path
            ),

          model:
            "whisper-large-v3",
        });

      const transcript =
        transcription.text;

      console.log(
        "QUESTION:",
        transcript
      );

      const completion =
        await groq.chat.completions.create({

          model:
            "llama-3.1-8b-instant",

          messages: [

            {
              role:
                "system",

              content:
`
You are acting as a REAL candidate during live interview.

Rules:
- answer naturally
- human tone
- no AI wording
- short conversational answers
- use resume naturally if relevant
- maximum 2-5 lines

Candidate Profile:
${resumeText}
`,
            },

            {
              role:
                "user",

              content:
`
Interview Question:
${transcript}

Answer naturally.
`,
            },
          ],

          temperature:
            1,

          max_tokens:
            120,
        });

      const answer =
        completion
          .choices[0]
          .message
          .content;

      console.log(
        "ANSWER GENERATED"
      );

      io.emit(
        "new-answer",
        {
          transcript,
          answer,
        }
      );

      console.log(
        "ANSWER SENT TO MOBILE"
      );

      fs.unlinkSync(
        req.file.path
      );

      res.json({

        transcript,
        answer,
      });

    } catch (error) {

      console.log(
        "BACKEND ERROR:"
      );

      console.log(error);

      res.status(500)
        .json({

          error:
            error.message,
        });
    }
  }
);

server.listen(
  5000,
  "0.0.0.0",
  () => {

    console.log(
      "SERVER RUNNING ON PORT 5000"
    );
  }
);