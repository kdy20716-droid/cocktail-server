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
    // 1. req.body에서 user_id도 함께 꺼내옵니다.
    const { user_id, name, image, description, ingredients, directions } =
      req.body;

    // 레시피 정보 저장
    const [result] = await pool.query(
      "INSERT INTO recipes(user_id, name, image, description) VALUES(?, ?, ?, ?)",
      [user_id, name, image, description],
    );

    const recipeId = result.insertId;

    // 재료(ingredients) 정보가 있다면 ingredients 테이블에 저장
    if (ingredients) {
      // 문자열로 들어온 경우 객체 배열로 변환
      const parsedIngredients =
        typeof ingredients === "string" ? JSON.parse(ingredients) : ingredients;

      for (const ingredient of parsedIngredients) {
        if (ingredient.name) {
          await pool.query(
            "INSERT INTO ingredients (recipe_id, name, amount) VALUES (?, ?, ?)",
            [recipeId, ingredient.name, ingredient.amount],
          );
        }
      }
    }

    // 만드는 방법(directions) 정보가 있다면 directions 테이블에 저장
    if (directions) {
      const parsedDirections =
        typeof directions === "string" ? JSON.parse(directions) : directions;

      for (let i = 0; i < parsedDirections.length; i++) {
        const description = parsedDirections[i];
        if (description) {
          await pool.query(
            "INSERT INTO directions (recipe_id, step_number, description) VALUES (?, ?, ?)",
            [recipeId, i + 1, description],
          );
        }
      }
    }

    res.status(201).json({ id: recipeId, name, image, description });
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

    let query =
      "SELECT r.*, u.name AS author_name FROM recipes r LEFT JOIN users u ON r.user_id = u.id";
    let params = [];

    // 검색어가 있을 경우 WHERE 조건문을 추가합니다.
    if (keyword) {
      query += " WHERE r.name LIKE ?";
      params.push(`%${keyword}%`);
    }
    query += " ORDER BY r.id DESC";

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
      "SELECT r.*, u.name AS author_name, (SELECT COUNT(*) FROM likes WHERE recipe_id = r.id) AS like_count FROM recipes r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?",
      [id],
    );
    if (result.length > 0) {
      const recipe = result[0];

      // 해당 레시피의 재료 목록 조회 추가
      const [ingredients] = await pool.query(
        "SELECT id, name, amount FROM ingredients WHERE recipe_id = ?",
        [id],
      );
      recipe.ingredients = ingredients;

      // 해당 레시피의 만드는 방법 목록 조회 추가
      const [directions] = await pool.query(
        "SELECT step_number, description FROM directions WHERE recipe_id = ? ORDER BY step_number ASC",
        [id],
      );
      recipe.directions = directions;

      res.status(200).json(recipe); // 일치하는 첫 번째 레시피 정보 반환
    } else {
      res.status(404).json({ message: "레시피를 찾을 수 없습니다." });
    }
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
    res.status(500).json({ message: "서버 에러", error: error.message });
  }
});

export default router;
