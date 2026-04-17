import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Environment variables (set on Render)
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// ✅ Mail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// ✅ ROUTE
app.post("/send-report", async (req, res) => {
  try {
    const { userEmail, score, riskLevel, answers } = req.body;

    console.log("STEP 1: Request received");

    const filePath = path.join(__dirname, "report.pdf");

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // ===== ✅ BACKGROUND IMAGE (FIXED PATH USING __dirname) =====
    const bgPath = path.join(__dirname, "letterhead.png");
    
    // ✅ DEBUG LOGS (CHECK RENDER LOGS)
    console.log("📁 Looking for image at:", bgPath);
    console.log("📁 File exists:", fs.existsSync(bgPath));

    if (fs.existsSync(bgPath)) {
      doc.image(bgPath, 0, 0, {
        width: doc.page.width,
        height: doc.page.height,
      });
      console.log("✅ Letterhead image added (full page)");
    } else {
      console.log("❌ letterhead.png NOT FOUND at:", bgPath);
    }

    // ===== PROFESSIONAL PDF DESIGN =====

    // ✅ PRECISE POSITIONING (instead of moveDown)
    doc.y = 180;

    // Title
    doc
      .fontSize(20)
      .fillColor("#1E3A8A")
      .text("Operational Risk Assessment Report", {
        align: "center",
      });

    doc.moveDown(1);

    // Subtitle
    doc
      .fontSize(12)
      .fillColor("gray")
      .text("Calibre Aviation – Ground Operations Analysis", {
        align: "center",
      });

    doc.moveDown(2);

    // Score Box
    doc
      .fontSize(40)
      .fillColor(score >= 60 ? "#16A34A" : "#DC2626")
      .text(`${score}%`, { align: "center" });

    doc
      .fontSize(16)
      .fillColor("black")
      .text(riskLevel, { align: "center" });

    doc.moveDown(2);

    // Divider
    doc
      .moveTo(100, doc.y)
      .lineTo(500, doc.y)
      .strokeColor("#E5E7EB")
      .stroke();

    doc.moveDown(1.5);

    // Section: Metrics Header
    doc
      .fontSize(16)
      .fillColor("#1E3A8A")
      .text("Operational Metrics", { align: "left" });

    doc.moveDown(1);

    // Table-like layout
    const labelX = 120;
    const valueX = 350;
    let startY = doc.y;

    const metrics = [
      ["Turnaround Time", `${answers.q1} minutes`],
      ["Staff Turnover", `${answers.q2}%`],
      ["Training Days", `${answers.q3}`],
      ["Delay Attribution", `${answers.q4}%`],
      ["Overtime Hours", `${answers.q5}`],
    ];

    metrics.forEach(([label, value], i) => {
      doc
        .fontSize(12)
        .fillColor("black")
        .text(label, labelX, startY + i * 20);

      doc
        .fontSize(12)
        .fillColor("#374151")
        .text(value, valueX, startY + i * 20);
    });

    doc.moveDown(6);

    // Divider
    doc
      .moveTo(100, doc.y)
      .lineTo(500, doc.y)
      .strokeColor("#E5E7EB")
      .stroke();

    doc.moveDown(1.5);

    // Recommendation Section
    doc
      .fontSize(16)
      .fillColor("#1E3A8A")
      .text("Recommendation", { align: "left" });

    doc.moveDown(1);

    doc
      .fontSize(12)
      .fillColor("black")
      .text(
        score >= 60
          ? "Moderate operational risk detected. Focus on process optimization, workforce stabilization, and delay attribution accuracy."
          : "High operational risk detected. Immediate intervention required in staffing, training, and turnaround efficiency to avoid operational disruptions.",
        {
          align: "justify",
          lineGap: 4,
        }
      );

    doc.moveDown(2);

    // Footer Note
    doc
      .fontSize(10)
      .fillColor("gray")
      .text(
        "This report is system-generated. For a detailed operational audit, contact Calibre Aviation Consulting.",
        { align: "center" }
      );

    doc.end();

    // Wait for file
    stream.on("finish", async () => {
      try {
        console.log("STEP 2: PDF created");

        const stats = fs.statSync(filePath);
        console.log("PDF SIZE:", stats.size);

        console.log("STEP 3: Sending email...");

        const info = await transporter.sendMail({
          from: EMAIL_USER,
          to: userEmail,
          cc: EMAIL_USER,
          subject: "Calibre Aviation Risk Scorecard Report",
          text: "Attached is your operational risk report.",
          attachments: [
            {
              filename: "Risk_Report.pdf",
              path: filePath,
            },
          ],
        });

        console.log("STEP 4: Email sent:", info.response);

        res.status(200).json({ success: true });

      } catch (err) {
        console.error("EMAIL ERROR:", err);
        res.status(500).json({ error: "Email failed" });
      }
    });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({ error: "Failed" });
  }
});

// ✅ PORT config (Render compatible)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
