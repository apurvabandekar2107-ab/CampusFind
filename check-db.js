const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "January21",
    database: "campusfind"
});

db.connect((err) => {

    if (err) {
        console.log("Connection failed:", err.message);
        return;
    }

    console.log("MySQL connected!");

    const lostStatusSql = `
        ALTER TABLE lost_items
        ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    `;

    const foundStatusSql = `
        ALTER TABLE found_items
        ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    `;

    db.query(lostStatusSql, (err) => {

        if (err) {
            console.log("Lost items update:", err.message);
        } else {
            console.log("lost_items status column added.");
        }

        db.query(foundStatusSql, (err) => {

            if (err) {
                console.log("Found items update:", err.message);
            } else {
                console.log("found_items status column added.");
            }

            db.end();

        });

    });

});