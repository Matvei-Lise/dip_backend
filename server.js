require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const sendEmail = async (newBooking) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.mail.ru",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Территория красивого тела" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: "Новая заявка на массаж",
    html: `
      <h2>Новая заявка от клиента</h2>
      <p><strong>Имя:</strong> ${newBooking.name}</p>
      <p><strong>Телефон:</strong> ${newBooking.phone}</p>
      <p><strong>Услуга:</strong> ${newBooking.service}</p>
      <p><strong>Сообщение:</strong> ${newBooking.message || "—"}</p>
      <p><strong>Дата:</strong> ${new Date(
        newBooking.date
      ).toLocaleString()}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email отправлен админу.");
  } catch (error) {
    console.error("Ошибка отправки email:", error);
  }
};

// API маршрут для формы
app.post("/api/contact", async (req, res) => {
  const { name, phone, service, message } = req.body;

  const phonePattern = /^[+]?[0-9]{10,15}$/;
  if (!phonePattern.test(phone)) {
    return res
      .status(400)
      .json({ success: false, message: "Некорректный номер телефона" });
  }

  const newBooking = {
    name,
    phone,
    service,
    message,
    date: new Date().toISOString(),
  };
  const filePath =
    process.env.NODE_ENV === "production"
      ? "/tmp/bookings.json"
      : "bookings.json";

  try {
    let bookings = [];
    if (fs.existsSync(filePath)) {
      bookings = JSON.parse(fs.readFileSync(filePath));
    }
    bookings.push(newBooking);
    fs.writeFileSync(filePath, JSON.stringify(bookings, null, 2));

    await sendEmail(newBooking); // Отправка email админу

    res.status(200).json({ success: true, message: "Заявка принята!" });
  } catch (err) {
    console.error("Ошибка при записи в файл", err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

// Маршрут для проверки данных
app.get("/api/bookings", (req, res) => {
  const filePath =
    process.env.NODE_ENV === "production"
      ? "/tmp/bookings.json"
      : "bookings.json";
  try {
    if (fs.existsSync(filePath)) {
      const bookings = JSON.parse(fs.readFileSync(filePath));
      res.status(200).json(bookings);
    } else {
      res.status(200).json([]);
    }
  } catch (err) {
    console.error("Ошибка при чтении файла", err);
    res.status(500).json({ success: false, message: "Ошибка сервера" });
  }
});

app.get("/admin", (req, res) => {
  res.sendFile(__dirname + "/dist/pages/admin.html"); // Отобразим админ-панель
});

// Обновить статус заявки
app.put("/api/bookings/:date", (req, res) => {
  const filePath =
    process.env.NODE_ENV === "production"
      ? "/tmp/bookings.json"
      : "bookings.json";
  try {
    let bookings = JSON.parse(fs.readFileSync(filePath));
    const index = bookings.findIndex((b) => b.date === req.params.date);
    if (index !== -1) {
      bookings[index].status = req.body.status;
      fs.writeFileSync(filePath, JSON.stringify(bookings, null, 2));
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "Заявка не найдена" });
    }
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Удалить заявку
app.delete("/api/bookings/:date", (req, res) => {
  const filePath =
    process.env.NODE_ENV === "production"
      ? "/tmp/bookings.json"
      : "bookings.json";
  try {
    let bookings = JSON.parse(fs.readFileSync(filePath));
    bookings = bookings.filter((b) => b.date !== req.params.date);
    fs.writeFileSync(filePath, JSON.stringify(bookings, null, 2));
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
