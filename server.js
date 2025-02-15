require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

//    API маршрут для формы
app.post("/api/contact", (req, res) => {
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

  fs.readFile("bookings.json", (err, data) => {
    const bookings = err ? [] : JSON.parse(data);
    bookings.push(newBooking);
    fs.writeFile("bookings.json", JSON.stringify(bookings, null, 2), (err) => {
      if (err) {
        res.status(500).json({ success: false, message: "Ошибка сервера" });
      } else {
        res.status(200).json({ success: true, message: "Заявка принята!" });
      }
    });
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
