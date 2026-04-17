import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ ENV (IMPORTANT FOR DEPLOYMENT)
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

    const filePath = path.join(process.cwd(), "report.pdf");

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const doc = new PDFDocument({ size: "A4" });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Background
    const bgPath = path.join(process.cwd(), "letterhead.png");
    if (fs.existsSync(bgPath)) {
      doc.image(bgPath, 0, 0, { width: 595 });
    }

    // Title
    doc.moveDown(10);
    doc.fontSize(18).fillColor("black").text("OPERATIONAL RISK REPORT", { align: "center" });

    doc.moveDown(2);
    doc.fontSize(28).fillColor("red").text(`${score}% (${riskLevel})`, { align: "center" });

    doc.moveDown(2);

    // Content (clean spacing)
    doc.fontSize(14).fillColor("black");

    doc.text(`Turnaround Time: ${answers.q1} minutes`, { align: "center" });
    doc.moveDown(0.5);

    doc.text(`Staff Turnover: ${answers.q2}%`, { align: "center" });
    doc.moveDown(0.5);

    doc.text(`Training Days: ${answers.q3}`, { align: "center" });
    doc.moveDown(0.5);

    doc.text(`Delay Attribution: ${answers.q4}%`, { align: "center" });
    doc.moveDown(0.5);

    doc.text(`Overtime Hours: ${answers.q5}`, { align: "center" });

    doc.moveDown(1.5);

    doc.fontSize(15).text("Recommendation:", { align: "center" });

    doc.moveDown(0.5);

    doc.fontSize(14).text(
      score >= 60
        ? "Moderate risk. Improve efficiency."
        : "High risk. Immediate action required.",
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

// ✅ IMPORTANT (Render compatible)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});