// const express = require("express"); // 옛날 문법
import express from "express"; // ES 문법 (자바스크립트 최신문법)
import fs from "fs";

// recipes 라우터 파일을 가져온다
import recipesRouter from "./routes/recipes.js";
import usersRouter from "./routes/users.js";

const app = express();

// uploads 폴더가 없으면 자동 생성
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.use((req, res, next) => {
  // CORS 허용
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  // GET(조회), POST(추가), PUT(수정), DELETE(삭제) 요청 허용
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  // JSON 데이터를 받을수있도록 허용
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // 브라우저의 OPTIONS 예비 요청에 대해 성공(200)으로 응답
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// JSON 형태로 들어오는 요청을 파싱해서 req.body에 추가
app.use(express.json());

// 'uploads' 폴더의 파일들을 클라이언트가 URL로 접근할 수 있게 허용
app.use("/uploads", express.static("uploads"));

// '/recipes' 경로로 들어오는 요청을 recipesRouter로 연결
app.use("/recipes", recipesRouter);
app.use("/users", usersRouter);

app.listen(4000, () => {
  console.log("4000번 포트번호로 서버 실행중");
});
