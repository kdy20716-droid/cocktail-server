CREATE TABLE recipes(
    name VARCHAR(50),
    image VARCHAR(200),
    descrpition TEXT
);
CREATE TABLE users(
    id VARCHAR(50),
    email VARCHAR(200),
    name VARCHAR(50),
    gender CHAR(1),
    password VARCHAR(200),
    nickname VARCHAR(100),
    phone VARCHAR(20),
    address VARCHAR(200),
    birth DATE
);
CREATE TABLE reviews(
    id VARCHAR(50),
    reviews VARCHAR(500)
    rating INT
);

    