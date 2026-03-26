// const express = require("express"); // 옛날 문법
import express from "express"; // ES 문법 (자바스크립트 최신문법)
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "qwer1234",
  database: "cocktail",
});

const app = express();

// JSON 형태로 들어오는 요청을 파싱해서 req.body에 추가
app.use(express.json());

app.get("/", (req, res) => {
  // send : 문자열, HTML< 객체 등 여러 타입을 보낼 수 있음
  res.send("<h1>Hello World!</h1>");
});

// DB에 값을 추가(post)
//INSERT INTO recipes(user_id, name, image, description)
//VALUES(1, '모히또', '모히또.jpg', '상큼하고 청량한 쿠바식 칵테일');
app.post("/recipes", async (req, res) => {
  try {
    const { name, image, description } = req.body;
    await pool.query(
      "INSERT INTO recipes(name, image, description) VALUES(?, ?, ?)",
      [name, image, description],
    );
    res.status(201).json({ name, image, description });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// DB에 있는 칵테일 레시피들 조회 : get
app.get("/recipes", async (req, res) => {
  const [result] = await pool.query("SELECT * FROM recipes");
  res.status(200).json(result);
});

app.listen(4000, () => {
  console.log("4000번 포트번호로 서버 실행중");
});
