const express = require("express");
const path = require("path");
const fs = require("fs");
const mysql = require("mysql2");
const session = require("express-session");
const multer = require("multer");
const dns = require("dns");

dns.lookup(process.env.DB_HOST, (err, address, family) => {
    if (err) {
        console.error("DB DNS LOOKUP FAILED:", err.message);
        return;
    }

    console.log("DB HOST RESOLVED TO:", address);
    console.log("IP FAMILY:", family);
});

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, "public", "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}


// ================================
// FILE UPLOAD CONFIGURATION
// ================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "public", "uploads"));
    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1E9);

        cb(
            null,
            uniqueName + path.extname(file.originalname)
        );
    }

});

const upload = multer({

    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {

        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }

    }

});

// Read form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || "development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Make public folder available
app.use(express.static(path.join(__dirname, "public")));

console.log("EXPRESS SERVER SETUP COMPLETE");

// ================================
// MYSQL / TiDB DATABASE CONNECTION
// ================================

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000,
    ssl: {
        minVersion: "TLSv1.2"
    },
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

// Test database connection
db.query("SELECT 1", (err) => {
    if (err) {
        console.error("DATABASE CONNECTION FAILED");
        console.error("Code:", err.code);
        console.error("Message:", err.message);
        console.error("SQL State:", err.sqlState);
        return;
    }

    console.log("MYSQL/TIDB CONNECTED SUCCESSFULLY");
});

// ================================
// HOMEPAGE
// ================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});


// ================================
// REGISTER USER
// ================================

app.post("/register", (req, res) => {

    const { name, email, accessPassword } = req.body;
const COLLEGE_ACCESS_PASSWORD = process.env.COLLEGE_ACCESS_PASSWORD;
if (accessPassword !== COLLEGE_ACCESS_PASSWORD) {
    return res.send(`
        <h1>Access Denied</h1>
        <p>Incorrect college access password.</p>
        <a href="/register.html">Try Again</a>
    `);
}


    const sql = `
        INSERT INTO users (name, email)
        VALUES (?,?)
    `;

    db.query(sql, [name, email], (err, result) => {

        if (err) {
            console.log(err);

            return res.send(`
                <h1>Registration Failed</h1>
                <p>The email may already be registered.</p>
                <a href="/register.html">Go back</a>
            `);
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport"
                      content="width=device-width, initial-scale=1.0">

                <title>Registration Successful | CampusFind</title>

                <link rel="stylesheet" href="/css/style.css">

                <style>
                    .success-page {
                        min-height: 100vh;
                        background: #f5f8ff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 30px;
                    }

                    .success-card {
                        width: 100%;
                        max-width: 500px;
                        background: white;
                        padding: 50px 40px;
                        border-radius: 20px;
                        text-align: center;
                        box-shadow: 0 15px 40px rgba(25,70,140,0.12);
                        border: 1px solid #e8eef8;
                    }

                    .success-icon {
                        width: 75px;
                        height: 75px;
                        margin: 0 auto 25px;
                        border-radius: 50%;
                        background: #dcfce7;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 38px;
                    }

                    .success-card h1 {
                        color: #172033;
                        font-size: 30px;
                        margin-bottom: 12px;
                    }

                    .success-card p {
                        color: #667085;
                        line-height: 1.6;
                        margin-bottom: 30px;
                    }

                    .success-button {
                        display: inline-block;
                        padding: 13px 25px;
                        border-radius: 10px;
                        background: #4f46e5;
                        color: white;
                        text-decoration: none;
                        font-weight: 600;
                    }

                    .success-button:hover {
                        background: #4338ca;
                    }
                </style>
            </head>

            <body>

                <div class="success-page">

                    <div class="success-card">

                        <div class="success-icon">
                            ✓
                        </div>

                        <h1>Registration Successful!</h1>

                        <p>
                            Welcome to
                            <strong>${name}</strong>!
                            Your account has been created successfully.
                        </p>

                        <a href="/" class="success-button">
                            Go to Homepage
                        </a>

                    </div>

                </div>

            </body>
            </html>
        `);
    });
});


// ================================
// LOGIN USER
// ================================

app.post("/login", (req, res) => {

   const { email, accessPassword } = req.body;

  const COLLEGE_ACCESS_PASSWORD = process.env.COLLEGE_ACCESS_PASSWORD;

if (accessPassword !== COLLEGE_ACCESS_PASSWORD) {
    return res.send(`
        <h1>Access Denied</h1>
        <p>Incorrect college access password.</p>
        <a href="/login.html">Try Again</a>
    `);
}

    const sql = `
    SELECT * FROM users
    WHERE email = ?
`;

    db.query(sql, [email], (err, results) => {

        if (err) {
            console.log(err);

            return res.send(`
                <h1>Login Failed</h1>
                <p>Please try again.</p>
                <a href="/login.html">Go back</a>
            `);
        }

        if (results.length === 0) {
            return res.send(`
                <h1>Invalid Login</h1>
                <p>Incorrect email or password.</p>
                <a href="/login.html">Try Again</a>
            `);
        }

        const user = results[0];

// Save logged-in user information
req.session.userId = user.id;
req.session.userName = user.name;
req.session.userEmail = user.email;

res.redirect("/dashboard.html");
    });
});
// ================================
// GET LOGGED-IN USER ACCOUNT
// ================================

app.get("/api/account", (req, res) => {

    // Check if user is logged in
    if (!req.session.userId) {
        return res.status(401).json({
            error: "Please login first"
        });
    }

    const sql = `
        SELECT id, name, email
        FROM users
        WHERE id = ?
    `;

    db.query(sql, [req.session.userId], (err, results) => {

        if (err) {
            console.log("ACCOUNT ERROR:", err);

            return res.status(500).json({
                error: "Failed to load account"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        res.json(results[0]);

    });

});
// ================================
// LOGOUT
// ================================

app.get("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            console.log("LOGOUT ERROR:", err);

            return res.status(500).json({
                error: "Logout failed"
            });
        }

        res.json({
            message: "Logged out successfully"
        });

    });

});
// ================================
// REPORT LOST ITEM
// ================================

app.post("/report-lost", upload.single("image"), (req, res) => {

    const {
        item_name,
        description,
        location,
        lost_date,
        contact
   } = req.body || {};

    const image = req.file
        ? "/uploads/" + req.file.filename
        : null;

    console.log("Uploaded file:", req.file);
    console.log("Image path:", image);

    const sql = `
        INSERT INTO lost_items
        (item_name, description, location, lost_date, contact, user_id, image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            item_name,
            description,
            location,
            lost_date,
            contact,
            req.session.userId,
            image
        ],
        (err, result) => {

            if (err) {

                console.log("DATABASE ERROR:", err);

                return res.send(`
                    <h1>Report Failed</h1>

                    <p>
                        Unable to save your lost item.
                    </p>

                    <a href="/report-lost.html">
                        Go Back
                    </a>
                `);
            }

            console.log("Lost item saved successfully!");
            console.log("Database ID:", result.insertId);
            console.log("Image:", image);

           res.send(`
<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Report Submitted | CampusFind</title>

    <link rel="stylesheet" href="/css/style.css">

    <style>

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: #f5f8ff;
            color: #172033;
        }

        .success-page {
            min-height: 100vh;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 40px 20px;

            background:
                radial-gradient(
                    circle at top left,
                    #e8edff,
                    transparent 35%
                ),
                #f5f8ff;
        }

        .success-card {
            width: 100%;
            max-width: 550px;

            background: white;

            padding: 55px 45px;

            border-radius: 24px;

            text-align: center;

            box-shadow:
                0 20px 60px rgba(31, 41, 91, 0.12);

            border: 1px solid #e7ebf5;
        }

        .success-icon {
            width: 90px;
            height: 90px;

            margin: 0 auto 25px;

            border-radius: 50%;

            background: #dcfce7;

            display: flex;
            align-items: center;
            justify-content: center;

            font-size: 45px;

            color: #16a34a;

            box-shadow:
                0 8px 25px rgba(22, 163, 74, 0.15);
        }

        .success-card h1 {
            margin: 0 0 15px;

            font-size: 32px;

            font-weight: 700;

            color: #172033;
        }

        .success-card p {
            margin: 0 auto 32px;

            max-width: 420px;

            font-size: 16px;

            line-height: 1.7;

            color: #667085;
        }

        .success-message {
            background: #f8fafc;

            border: 1px solid #e6eaf0;

            border-radius: 12px;

            padding: 15px;

            margin-bottom: 30px;

            color: #475467;

            font-size: 14px;
        }

        .success-button {
            display: inline-block;

            padding: 14px 28px;

            border-radius: 11px;

            background: #4f46e5;

            color: white;

            text-decoration: none;

            font-weight: 600;

            font-size: 15px;

            transition: all 0.2s ease;

            box-shadow:
                0 8px 20px rgba(79, 70, 229, 0.22);
        }

        .success-button:hover {
            background: #4338ca;

            transform: translateY(-2px);

            box-shadow:
                0 12px 25px rgba(79, 70, 229, 0.28);
        }

        .secondary-link {
            display: block;

            margin-top: 18px;

            color: #667085;

            text-decoration: none;

            font-size: 14px;
        }

        .secondary-link:hover {
            color: #4f46e5;
        }

        @media (max-width: 600px) {

            .success-card {
                padding: 40px 25px;
            }

            .success-card h1 {
                font-size: 26px;
            }

            .success-icon {
                width: 75px;
                height: 75px;
                font-size: 36px;
            }

        }

    </style>

</head>

<body>

    <div class="success-page">

        <div class="success-card">

            <div class="success-icon">
                ✓
            </div>

            <h1>
                Lost Item Reported!
            </h1>

            <p>
                Your lost item has been successfully
                submitted to CampusFind.
            </p>

            <div class="success-message">
                Your report has been saved. Other CampusFind
                users can now see the item and help you find it.
            </div>

            <a
                href="/dashboard.html"
                class="success-button"
            >
                Go to Dashboard
            </a>

            <a
                href="/items.html"
                class="secondary-link"
            >
                Browse Lost & Found Items
            </a>

        </div>

    </div>

</body>

</html>
`);
        }
    );
});

// ================================
// GET LOST ITEMS
// ================================

app.get("/api/lost-items", (req, res) => {

    const sql = `
        SELECT *
        FROM lost_items
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                error: "Failed to load lost items"
            });
        }

        res.json(results);
    });
});
app.get("/api/found-items", (req, res) => {

    const sql = `
        SELECT *
        FROM found_items
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                error: "Failed to load found items"
            });
        }

        res.json(results);
    });
});
// ================================
// REPORT FOUND ITEM
// ================================

console.log("REPORT FOUND ROUTE REGISTERED");

app.post("/report-found", upload.single("image"), (req, res) => {
    
    console.log("FOUND ROUTE HIT");
    console.log("FOUND ITEM REQUEST RECEIVED");
console.log("Body:", req.body);
console.log("File:", req.file);

  const {
    item_name,
    description,
    location,
    found_date,
    contact
} = req.body || {};

    const image = req.file
        ? "/uploads/" + req.file.filename
        : null;

    console.log("Uploaded file:", req.file);
    console.log("Image path:", image);

    const sql = `
        INSERT INTO found_items
        (item_name, description, location, found_date, contact, user_id, image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            item_name,
            description,
            location,
            found_date,
            contact,
            req.session.userId,
            image
        ],
        (err, result) => {

            if (err) {
                console.log("DATABASE ERROR:", err);

                return res.send(`
                    <h1>Report Failed</h1>

                    <p>
                        Unable to save your found item.
                    </p>

                    <a href="/report-found.html">
                        Go Back
                    </a>
                `);
            }

            console.log("Found item saved successfully!");
            console.log("Database ID:", result.insertId);
            console.log("Image:", image);

            res.send(`
                <!DOCTYPE html>
                <html lang="en">

                <head>
                    <meta charset="UTF-8">

                    <meta name="viewport"
                          content="width=device-width, initial-scale=1.0">

                    <title>Report Submitted | CampusFind</title>

                    <link rel="stylesheet" href="/css/style.css">

                    <style>

                        .success-page {
                            min-height: 100vh;
                            background: #f5f8ff;

                            display: flex;
                            align-items: center;
                            justify-content: center;

                            padding: 30px;
                        }

                        .success-card {
                            width: 100%;
                            max-width: 500px;

                            background: white;

                            padding: 50px 40px;

                            border-radius: 20px;

                            text-align: center;

                            box-shadow:
                                0 15px 40px
                                rgba(25, 70, 140, 0.12);

                            border: 1px solid #e8eef8;
                        }

                        .success-icon {
                            width: 75px;
                            height: 75px;

                            margin: 0 auto 25px;

                            border-radius: 50%;

                            background: #dcfce7;

                            display: flex;
                            align-items: center;
                            justify-content: center;

                            font-size: 38px;

                            color: #16a34a;
                        }

                        .success-card h1 {
                            color: #172033;

                            font-size: 30px;

                            margin-bottom: 12px;
                        }

                        .success-card p {
                            color: #667085;

                            line-height: 1.6;

                            margin-bottom: 30px;
                        }

                        .success-button {
                            display: inline-block;

                            padding: 13px 25px;

                            border-radius: 10px;

                            background: #4f46e5;

                            color: white;

                            text-decoration: none;

                            font-weight: 600;

                            transition: 0.2s;
                        }

                        .success-button:hover {
                            background: #4338ca;

                            transform: translateY(-1px);
                        }

                    </style>

                </head>

                <body>

                    <div class="success-page">

                        <div class="success-card">

                            <div class="success-icon">
                                ✓
                            </div>

                            <h1>
                                Found Item Reported!
                            </h1>

                            <p>
                                Your found item has been successfully
                                submitted to CampusFind.
                            </p>

                            <a
                                href="/dashboard.html"
                                class="success-button"
                            >
                                Back to Dashboard
                            </a>

                        </div>

                    </div>

                </body>

                </html>
            `);
        }
    );
});

// ================================
// MY REPORTS
// ================================

app.get("/api/my-reports", (req, res) => {

    if (!req.session.userId) {
        return res.status(401).json({
            error: "Please login first"
        });
    }

    const userId = req.session.userId;

    const lostSql = `
        SELECT
            id,
            item_name,
            description,
            location,
            lost_date AS report_date,
            contact,
image,
status,
'lost' AS report_type
        FROM lost_items
        WHERE user_id = ?
    `;

    const foundSql = `
        SELECT
            id,
            item_name,
            description,
            location,
            found_date AS report_date,
            contact,
image,
status,
'found' AS report_type
        FROM found_items
        WHERE user_id = ?
    `;

    db.query(lostSql, [userId], (err, lostItems) => {

        if (err) {
            console.log(err);

            return res.status(500).json({
                error: "Failed to load lost reports"
            });
        }

        db.query(foundSql, [userId], (err, foundItems) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    error: "Failed to load found reports"
                });
            }

            res.json([
                ...lostItems,
                ...foundItems
            ]);
        });
    });
});

// ================================
// MARK REPORT AS RECOVERED
// ================================

// ================================
// GET SINGLE ITEM DETAILS
// ================================

app.get("/api/items/:type/:id", (req, res) => {

    const { type, id } = req.params;

    let table;

    if (type === "lost") {
        table = "lost_items";
    } else if (type === "found") {
        table = "found_items";
    } else {
        return res.status(400).json({
            error: "Invalid item type"
        });
    }

    const sql = `
        SELECT *
        FROM ${table}
        WHERE id = ?
    `;

    db.query(sql, [id], (err, results) => {

        if (err) {
            console.log("ITEM DETAILS ERROR:", err);

            return res.status(500).json({
                error: "Failed to load item"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        res.json({
            ...results[0],
            report_type: type
        });
    });

});
// ================================
// MARK REPORT AS RECOVERED
// ================================

console.log("RECOVERY ROUTE REGISTERED");

app.put("/api/reports/:type/:id/recovered", (req, res) => {

    const { type, id } = req.params;

    if (!req.session.userId) {
        return res.status(401).json({
            error: "Please login first"
        });
    }

    let table;

    if (type === "lost") {
        table = "lost_items";
    } else if (type === "found") {
        table = "found_items";
    } else {
        return res.status(400).json({
            error: "Invalid report type"
        });
    }

    const sql = `
        UPDATE ${table}
        SET status = 'RECOVERED'
        WHERE id = ?
        AND user_id = ?
    `;

    db.query(
        sql,
        [id, req.session.userId],
        (err, result) => {

            if (err) {
                console.log("RECOVERY ERROR:", err);

                return res.status(500).json({
                    error: "Failed to mark report as recovered"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: "Report not found"
                });
            }

            res.json({
                success: true,
                message: "Report marked as recovered"
            });

        }
    );

});
// ================================
// DELETE MY REPORT
// ================================

console.log("DELETE REPORT ROUTE REGISTERED");

app.delete("/api/reports/:type/:id", (req, res) => {
    
    console.log("DELETE REQUEST RECEIVED:", req.params);

    const { type, id } = req.params;

    if (!req.session.userId) {
        return res.status(401).json({
            error: "Please login first"
        });
    }

    let table;

    if (type === "lost") {
        table = "lost_items";
    } else if (type === "found") {
        table = "found_items";
    } else {
        return res.status(400).json({
            error: "Invalid report type"
        });
    }

    const sql = `
        DELETE FROM ${table}
        WHERE id = ?
        AND user_id = ?
    `;

    db.query(
        sql,
        [id, req.session.userId],
        (err, result) => {

            if (err) {
                console.log("DELETE REPORT ERROR:", err);

                return res.status(500).json({
                    error: "Failed to delete report"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: "Report not found"
                });
            }

            res.json({
                success: true,
                message: "Report deleted successfully"
            });

        }
    );

});

// ================================
// GET RECENT LOST & FOUND ITEMS
// ================================

app.get("/api/recent-items", (req, res) => {

    const lostSql = `
        SELECT
            id,
            item_name,
            description,
            location,
            lost_date AS report_date,
            image,
            status,
            'lost' AS report_type
        FROM lost_items
    `;

    const foundSql = `
        SELECT
            id,
            item_name,
            description,
            location,
            found_date AS report_date,
            image,
            status,
            'found' AS report_type
        FROM found_items
    `;

    db.query(lostSql, (err, lostItems) => {

        if (err) {
            console.log("RECENT LOST ITEMS ERROR:", err);

            return res.status(500).json({
                error: "Failed to load recent lost items"
            });
        }

        db.query(foundSql, (err, foundItems) => {

            if (err) {
                console.log("RECENT FOUND ITEMS ERROR:", err);

                return res.status(500).json({
                    error: "Failed to load recent found items"
                });
            }

            const allItems = [
                ...lostItems,
                ...foundItems
            ];

            allItems.sort((a, b) => {
                return new Date(b.report_date) - new Date(a.report_date);
            });

            res.json(allItems.slice(0, 3));

        });

    });

});

// ================================
// GET TOTAL CAMPUS USERS
// ================================
 
console.log("TOTAL USERS ROUTE REGISTERED");

app.get("/api/total-users", (req, res) => {

    const sql = `
        SELECT COUNT(*) AS totalUsers
        FROM users
    `;

    db.query(sql, (err, result) => {

        if (err) {
            console.log("TOTAL USERS ERROR:", err);

            return res.status(500).json({
                error: "Failed to load total users"
            });
        }

        res.json({
            totalUsers: result[0].totalUsers
        });

    });

});

app.get("/test-route", (req, res) => {
    console.log("TEST ROUTE WAS HIT");
    res.send("TEST ROUTE WORKS");
});

// ================================
// START SERVER
// ================================

app.listen(PORT, () => {
    console.log(`CampusFind is running at http://localhost:${PORT}`);
});