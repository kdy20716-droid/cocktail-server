import express from "express";
import pool from "../db.js";

const router = express.Router();

// 회원가입 API : POST /users/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // users 테이블에 새 사용자 정보 저장
    await pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, password],
    );

    res.status(201).json({ message: "회원가입이 완료되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 로그인 API : POST /users/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 이메일과 비밀번호가 일치하는 사용자 조회
    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ? AND password = ?",
      [email, password],
    );

    if (users.length > 0) {
      res.status(200).json({ message: "로그인 성공", user: users[0] });
    } else {
      res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 일치하지 않습니다." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

export default router;
