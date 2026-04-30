import pool from "../db.js";
import fs from "fs";
import path from "path";

// DB에 값을 추가(post)
export const createRecipe = async (req, res) => {
  try {
    const { name, description, ingredients, directions } = req.body;
    const userId = req.userId; // authMiddleware에서 저장됨

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
};

// DB에 있는 칵테일 레시피들 조회
export const getRecipes = async (req, res) => {
  try {
    const keyword = req.query.query;
    const sort = req.query.sort || "latest_desc";

    let query = `
      SELECT r.*, u.name AS author_name, COUNT(l.id) AS like_count
      FROM recipes r 
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN likes l ON r.id = l.recipe_id
    `;
    let params = [];

    if (keyword) {
      query += " WHERE r.name LIKE ?";
      params.push(`%${keyword}%`);
    }

    query += " GROUP BY r.id";

    if (sort === "latest_asc") {
      query += " ORDER BY r.id ASC";
    } else if (sort === "popular") {
      query += " ORDER BY like_count DESC, r.id DESC";
    } else if (sort === "name_asc") {
      query += " ORDER BY r.name ASC";
    } else if (sort === "name_desc") {
      query += " ORDER BY r.name DESC";
    } else {
      query += " ORDER BY r.id DESC";
    }

    const [result] = await pool.query(query, params);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
};

// 특정 사용자가 작성한 레시피 목록 조회
export const getUserRecipes = async (req, res) => {
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
};

// 특정 레시피 상세 조회
export const getRecipeById = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "SELECT r.*, u.name AS author_name, u.email AS author_email, (SELECT COUNT(*) FROM likes WHERE recipe_id = r.id) AS like_count FROM recipes r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?",
      [id],
    );
    if (result.length > 0) {
      res.status(200).json(result[0]);
    } else {
      res.status(404).json({ message: "레시피를 찾을 수 없습니다." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
};

// 특정 레시피 수정
export const updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, ingredients, directions } = req.body;
    const userId = req.userId;

    const [recipes] = await pool.query("SELECT * FROM recipes WHERE id = ?", [
      id,
    ]);
    if (recipes.length === 0) {
      return res.status(404).json({ message: "레시피를 찾을 수 없습니다." });
    }
    const recipe = recipes[0];

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

    let image = recipe.image;
    if (req.file) {
      image = `http://localhost:4000/uploads/${req.file.filename}`;
    }

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
};

// 특정 레시피 삭제
export const deleteRecipe = async (req, res) => {
  try {
    const { email } = req.body;
    const { id } = req.params;

    const [recipes] = await pool.query("SELECT * FROM recipes WHERE id = ?", [
      id,
    ]);
    const [users] = await pool.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    const recipe = recipes[0];
    const requestUser = users[0];

    if (
      email !== "admin@cocktail.com" &&
      (!recipe || !requestUser || recipe.user_id !== requestUser.id)
    ) {
      return res.status(403).json({ message: "삭제 권한이 없습니다." });
    }

    // 이미지 파일 삭제
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
};

// 댓글 목록 조회
export const getRecipeComments = async (req, res) => {
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
};

// 댓글 추가
export const addComment = async (req, res) => {
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
};

// 좋아요 토글
export const toggleLike = async (req, res) => {
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
};

// 댓글 삭제
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { user_id } = req.body;

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
};
