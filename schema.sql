-- 외래키 체크를 일시적으로 해제 (3730 에러 방지)
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS directions;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS users;

-- 외래키 체크 다시 켜기
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users(
	id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password VARCHAR(200) NOT NULL
);
CREATE TABLE recipes(
	id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT,
	name VARCHAR(50) NOT NULL,
    image VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    ingredients TEXT,
    directions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE ingredients (
	id INT AUTO_INCREMENT PRIMARY KEY,
	recipe_id INT,
	name VARCHAR(100) NOT NULL,    
	amount VARCHAR(50) NOT NULL,   
	FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);
CREATE TABLE directions(
	id INT AUTO_INCREMENT PRIMARY KEY,
	recipe_id INT,
	content TEXT NOT NULL,
	FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- 댓글 테이블
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 좋아요 테이블
CREATE TABLE likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY(recipe_id, user_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

SELECT * FROM users;
SELECT * FROM recipes;