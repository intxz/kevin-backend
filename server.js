const express = require("express");
const dotenv = require("dotenv");
const axios = require("axios");
const cors = require("cors");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "https://kevintcfit.com", 
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }),
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const limiter = rateLimit({
  windowMs: 0, 
  max: 2, 
  message: "Too many requests from this IP, please try again after 24 hours",
  handler: (req, res) => {
    res.status(410).json({
      message: "The resource is currently unavailable due to too many requests.",
      error: "Resource gone temporarily. You might try again later.",
    });
  },
});

app.use("/send-email", limiter);

let resourceUnavailable = false;

app.post("/send-email", async (req, res) => {

  if (resourceUnavailable) {
    return res.status(410).json({
      message: "The resource is currently unavailable.",
      error: "Resource gone temporarily. You might try again later.",
    });
  }

  console.log("POST request received at /send-email");
  console.log("Request body:", req.body);
  const {
    user_firstname,
    user_lasttname,
    user_objectives,
    user_email,
    user_phonenumber,
    user_response,
    user_plan,
    user_disponibility,
    user_found,
    message,
  } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: process.env.EMAIL_USERNAME,
    subject: `FORRO TIENES UN CLIENTE`,
    text: `Nombre: ${user_firstname} ${user_lasttname}\n
           Objetivo: ${user_objectives}\n
           Correo: ${user_email}\n
           Teléfono: ${user_phonenumber}\n
           Respuesta: ${user_response}\n
           Plan: ${user_plan}\n
           Disponibilidad: ${user_disponibility}\n
           Encontrado por: ${user_found}\n
           Mensaje: ${message}`,
  };

  try {
    let emailIsValid = true;

    try {
      const verificationResponse = await axios.get(
        `https://api.hunter.io/v2/email-verifier?email=${user_email}&api_key=${process.env.HUNTER_API_KEY}`,
      );

      const { data } = verificationResponse;

      // Check the email status
      if (data.data.status === "invalid") {
        emailIsValid = false;
        return res.status(404).json({
          message: "The provided email address is invalid.",
          error: "Invalid email detected",
          suggestion: "Please provide a valid email address.",
        });
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.warn(
          "Verification limit reached, proceeding without verification...",
        );
      } else {
        throw error;
      }
    }

    // If the email is valid or verification couldn't be performed, send the email
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email successfully sent" });
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message,
    );
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("SERVIDOR DE QUEBIN");
});
