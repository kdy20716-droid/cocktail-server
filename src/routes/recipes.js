import express from "express";
// DB와 연결된 pool을 db.js 파일에서 가져온다
import pool from "../db.js";

const router = express.Router(); // Router 객체 생성
// router는 app처럼 get, post, put, delete 사용 가능

// DB에 값을 추가(post)
//INSERT INTO recipes(user_id, name, image, description)
//VALUES(1, '모히또', '모히또.jpg', '상큼하고 청량한 쿠바식 칵테일');
router.post("/", async (req, res) => {
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
// +) 최신등록순으로 조회
// router.get("/")
// -> app.js에서 app.use("/recipes", recipesRouter)로 연결되었기 때문에
// 실제 주소는 GET /recipes
router.get("/", async (req, res) => {
  try {
    const [result] = await pool.query("SELECT * FROM recipes ORDER BY id DESC");
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

export default router;
