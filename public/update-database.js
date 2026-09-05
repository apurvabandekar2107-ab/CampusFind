const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "January21",
    database: "campusfind"
});

db.connect((err) => {

    if (err) {
        console.log("Database connection failed:", err.message);
        return;
    }

    console.log("Connected to MySQL.");

    const queries = [

        `ALTER TABLE lost_items
         ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'`,

        `ALTER TABLE found_items
         ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'`

    ];

    db.query(queries[0], (err) => {

        if (err) {
            console.log("Lost items update:", err.message);
        } else {
            console.log("lost_items updated successfully.");
        }

        db.query(queries[1], (err) => {

            if (err) {
                console.log("Found items update:", err.message);
            } else {
                console.log("found_items updated successfully.");
            }

            db.end();

        });

    });

});