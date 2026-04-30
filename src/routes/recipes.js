import express from "express";
import authMiddleware from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import * as recipesController from "../controllers/recipesController.js";

const router = express.Router();

// 레시피 관련 라우트
router.get("/", recipesController.getRecipes);
router.get("/user/:userId", recipesController.getUserRecipes);
router.get("/:id", recipesController.getRecipeById);
router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  recipesController.createRecipe,
);
router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  recipesController.updateRecipe,
);
router.delete("/:id", recipesController.deleteRecipe);

// 댓글 관련 라우트
router.get("/:id/comments", recipesController.getRecipeComments);
router.post("/:id/comments", recipesController.addComment);
router.delete("/:id/comments/:commentId", recipesController.deleteComment);

// 좋아요 관련 라우트
router.post("/:id/like", recipesController.toggleLike);

export default router;
