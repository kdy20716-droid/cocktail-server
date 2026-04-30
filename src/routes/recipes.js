import express from "express";
// DB와 연결된 pool을 db.js 파일에서 가져온다
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";
import fs from "fs";
import path from "path";
import upload from "../middleware/upload.js"; // 따로 분리해둔 upload.js 설정을 불러옵니다.

const router = express.Router(); // Router 객체 생성
// router는 app처럼 get, post, put, delete 사용 가능

// uploads 폴더가 없으면 자동 생성
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// DB에 값을 추가(post)
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { user_id, name, description, ingredients, directions } = req.body;
    const userId = req.userId; // authMiddleware에서 req 객체에 userId를 저장했으므로 여기서 꺼내올 수 있습니다.

    // 업로드된 파일이 있으면 이미지 접근 주소를 만들고, 없으면 null
    const image = req.file
      ? `http://localhost:4000/uploads/${req.file.filename}`
      : null;

    await pool.query(
      "INSERT INTO recipes(user_id, name, image, description, ingredients, directions) VALUES(?, ?, ?, ?, ?, ?)",
      [userId, name, image, description, ingredients, directions],
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
    // 클라이언트에서 보낸 쿼리스트링(?query=...) 값을 가져옵니다.
    const keyword = req.query.query;
    const sort = req.query.sort || "latest_desc"; // 정렬 조건 파라미터 가져오기

    // 인기순 정렬을 위해 likes 테이블과 JOIN 하고 좋아요 개수(COUNT)를 구합니다.
    let query = `
      SELECT r.*, u.name AS author_name, COUNT(l.id) AS like_count
      FROM recipes r 
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN likes l ON r.id = l.recipe_id
    `;
    let params = [];

    // 검색어가 있을 경우 WHERE 조건문을 추가합니다.
    if (keyword) {
      query += " WHERE r.name LIKE ?";
      params.push(`%${keyword}%`);
    }

    query += " GROUP BY r.id"; // COUNT 함수를 쓰기 위해 그룹화

    // 정렬 조건에 따른 ORDER BY 추가
    if (sort === "latest_asc") {
      query += " ORDER BY r.id ASC";
    } else if (sort === "popular") {
      query += " ORDER BY like_count DESC, r.id DESC";
    } else if (sort === "name_asc") {
      query += " ORDER BY r.name ASC";
    } else if (sort === "name_desc") {
      query += " ORDER BY r.name DESC";
    } else {
      query += " ORDER BY r.id DESC"; // 기본값: 최신순(내림차순)
    }

    const [result] = await pool.query(query, params);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 특정 사용자가 작성한 레시피 목록 조회
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [result] = await pool.query(
      "SELECT r.*, u.name AS author_name FROM recipes r LEFT JOIN users u ON r.user_id = u.id WHERE r.user_id = ? ORDER BY r.id DESC",
      [userId],
    );
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 특정 레시피 상세 조회 API : GET /recipes/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "SELECT r.*, u.name AS author_name, u.email AS author_email, (SELECT COUNT(*) FROM likes WHERE recipe_id = r.id) AS like_count FROM recipes r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?",
      [id],
    );
    if (result.length > 0) {
      res.status(200).json(result[0]); // 일치하는 첫 번째 레시피 정보 반환
    } else {
      res.status(404).json({ message: "레시피를 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 특정 레시피 수정 API : PUT /recipes/:id
router.put("/:id", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    //id를 formdata에 넣어서 요청을 보낸다면 -> req.body
    //id를 URL에 넣어서 요청을 보낸다면 -> req.params
    const { id } = req.params;
    const { name, description, ingredients, directions } = req.body;
    const userId = req.userId;

    // 1. 기존 레시피 확인
    const [recipes] = await pool.query("SELECT * FROM recipes WHERE id = ?", [
      id,
    ]);
    if (recipes.length === 0) {
      return res.status(404).json({ message: "레시피를 찾을 수 없습니다." });
    }
    const recipe = recipes[0];

    // 2. 권한 확인
    const [users] = await pool.query("SELECT email FROM users WHERE id = ?", [
      userId,
    ]);
    const requestUser = users[0];

    if (
      !requestUser ||
      (requestUser.email !== "admin@cocktail.com" && recipe.user_id !== userId)
    ) {
      return res.status(403).json({ message: "수정 권한이 없습니다." });
    }

    // 3. 업데이트할 이미지 결정
    let image = recipe.image;
    if (req.file) {
      image = `http://localhost:4000/uploads/${req.file.filename}`;
    }

    // 4. 레시피 업데이트
    await pool.query(
      "UPDATE recipes SET name = ?, image = ?, description = ?, ingredients = ?, directions = ? WHERE id = ?",
      [name, image, description, ingredients, directions, id],
    );

    res
      .status(200)
      .json({ message: "레시피가 성공적으로 수정되었습니다.", id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// DB에 있는 특정 칵테일 레시피 삭제 : delete
router.delete("/:id", async (req, res) => {
  try {
    const { email } = req.body;

    const { id } = req.params;

    // 1. 삭제할 레시피 정보와 요청한 유저 정보 조회
    const [recipes] = await pool.query("SELECT * FROM recipes WHERE id = ?", [
      id,
    ]);
    const [users] = await pool.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    const recipe = recipes[0];
    const requestUser = users[0];

    // 2. 관리자이거나 작성자 본인인지 확인
    if (
      email !== "admin@cocktail.com" &&
      (!recipe || !requestUser || recipe.user_id !== requestUser.id)
    ) {
      return res.status(403).json({ message: "삭제 권한이 없습니다." });
    }

    // 3. 권한이 확인되면 레시피 삭제
    // 이미지 파일 삭제 로직 추가
    if (recipe && recipe.image) {
      const filename = recipe.image.split("/").pop();
      const filePath = path.join("uploads", filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await pool.query("DELETE FROM recipes WHERE id = ?", [id]);
    res.status(200).json({ message: "레시피가 성공적으로 삭제되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 특정 레시피의 댓글 목록 조회 API
router.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const [comments] = await pool.query(
      "SELECT c.*, u.name AS user_name FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.recipe_id = ? ORDER BY c.created_at DESC",
      [id],
    );
    res.status(200).json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 특정 레시피에 댓글 추가 API
router.post("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, content } = req.body;
    await pool.query(
      "INSERT INTO comments (recipe_id, user_id, content) VALUES (?, ?, ?)",
      [id, user_id, content],
    );
    res.status(201).json({ message: "댓글이 등록되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 특정 레시피 좋아요 토글 API
router.post("/:id/like", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const [existing] = await pool.query(
      "SELECT * FROM likes WHERE recipe_id = ? AND user_id = ?",
      [id, user_id],
    );

    if (existing.length > 0) {
      await pool.query(
        "DELETE FROM likes WHERE recipe_id = ? AND user_id = ?",
        [id, user_id],
      );
      res.status(200).json({ message: "좋아요 취소", isLiked: false });
    } else {
      await pool.query("INSERT INTO likes (recipe_id, user_id) VALUES (?, ?)", [
        id,
        user_id,
      ]);
      res.status(201).json({ message: "좋아요 추가", isLiked: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

// 특정 레시피의 댓글 삭제 API
router.delete("/:id/comments/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params;
    const { user_id } = req.body;

    // 권한 확인 및 삭제를 동시에 처리 (작성자의 user_id가 일치해야만 삭제됨)
    const [result] = await pool.query(
      "DELETE FROM comments WHERE id = ? AND user_id = ?",
      [commentId, user_id],
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "댓글이 삭제되었습니다." });
    } else {
      res
        .status(403)
        .json({ message: "삭제 권한이 없거나 댓글이 존재하지 않습니다." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

export default router;
